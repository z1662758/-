<template>
  <div class="domain-page" v-loading="busy === 'load'">
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="notice" />
    <template v-if="model">
      <section v-if="view !== 'map'" class="toolbar">
        <strong>供应链公共框架</strong><span v-if="dirty" class="version"><i>有修改</i></span>
        <el-button text @click="check" :loading="busy === 'check'">校验框架</el-button><el-button text @click="openOwl">OWL推理</el-button><el-button text @click="maintenanceOpen = true">框架维护与修订</el-button><el-button text @click="exportModel">导出框架</el-button>
        <input ref="modelFile" type="file" accept=".json" hidden @change="importModel"/>
      </section>
      <div class="workspace" :class="{'map-workspace':['map','agent','world','environment'].includes(view),'map-catalog-visible':mapCatalog,'map-details-visible':mapDetails}">
        <aside class="catalog">
          <div class="catalog-title">模型目录 <el-button text size="small" @click="editMeta">设置</el-button></div>
          <el-input v-model="search" placeholder="搜索对象、关系、指标" clearable class="search"/>
          <div v-for="group in groups" :key="group.key" class="catalog-group">
            <div class="group-head"><span>{{ group.label }} <small>{{ model[group.key].length }}</small></span><button @click="addItem(group.key)" :aria-label="`新增${group.label}`">＋</button></div>
            <button v-for="item in filtered(group.key)" :key="item.id" class="catalog-item" :class="{active: selected?.key === group.key && selected?.id === item.id}" @click="select(group.key, item.id)"><span class="item-dot" :style="{background: group.color}"/><span>{{ item.label }}</span><small v-if="group.key === 'metrics' && item.status === 'candidate'">待确认</small></button>
          </div>
          <div class="catalog-foot">供货和制造层级相对于研究对象确定，可继续扩展。图中为角色与类型，实际企业和零件由数据绑定；箭头说明可悬停查看。</div>
        </aside>
        <main class="network-panel">
          <div class="network-head"><div><strong>{{ view === 'map' ? '铀供应链领域模型' : model.name }}</strong><span>{{ viewDescriptions[view] }}</span></div><el-radio-group v-model="view" size="small"><el-radio-button value="map">供需网络</el-radio-button><el-radio-button value="environment">环境模型</el-radio-button><el-radio-button value="agent">Agent建模</el-radio-button><el-radio-button value="structure">结构</el-radio-button><el-radio-button value="metrics">指标</el-radio-button><el-radio-button value="dependency">计算依赖</el-radio-button><el-radio-button value="subgraph" :disabled="!analysis?.retrieval">问题子图</el-radio-button></el-radio-group></div>
          <div v-if="view === 'map' && (mapCatalog || mapDetails)" class="map-panel-actions"><el-button text size="small" @click="mapCatalog = !mapCatalog">{{ mapCatalog ? '收起对象目录' : '对象与关系目录' }}</el-button><el-button text size="small" @click="mapDetails = !mapDetails">{{ mapDetails ? '收起属性面板' : '属性与指标面板' }}</el-button></div><DomainSupplyNetwork v-if="view === 'map'" :model="model" :rows="instance?.rows || []" :instance="instance" @select="select" @bind-rows="bindAgentRows"/><div v-show="!['map','agent','world','environment'].includes(view)" ref="canvas" class="network-canvas"/>
          <DomainAgentModeling v-if="view === 'agent'" :model="model" :instance="instance" :focus-type="selected?.key === 'types' ? selected.id : ''" :focus-entity="agentFocusEntity" @update-definitions="updateAgentDefinitions" @select="select"/><DomainEnvironmentModel v-if="view === 'environment'" :model="model" :mode="view" @update-environment="updateEnvironment" @update-world="updateWorld"/><div class="network-footer"><span><i style="background:#3b82f6"/>对象 / 角色</span><span><i style="background:#14b8a6"/>输入</span><span><i style="background:#8b5cf6"/>输出指标</span><span><i style="background:#f59e0b"/>关键因素</span><el-button text size="small" @click="resetGraph">重置视图</el-button></div>
          <div v-if="view !== 'map'" class="input-banner"><div><strong>框架已定义，数据随问题变化</strong><p>{{ instance ? `已绑定 ${instance.rows.length} 行对象数据 · ${computedCount} 项计算结果` : '无需业务数据即可编辑框架。导入数据后检查字段映射、单位和计算结果。' }}</p></div><el-button @click="dataOpen = true">{{ instance ? '管理输入数据' : '导入数据 / 计算' }}</el-button></div>
        </main>
        <aside class="details">
          <template v-if="selectedItem">
            <div class="detail-kicker">{{ groupName(selected.key) }}定义</div><h2>{{ selectedItem.label }}</h2><code>{{ selectedItem.id }}</code><p class="detail-description">{{ selectedItem.description || '可编辑并补充此定义。' }}</p>
            <div class="detail-actions"><el-button size="small" @click="editItem">编辑定义</el-button><el-button size="small" text type="danger" @click="removeItem">删除</el-button></div>
            <template v-if="selectedItem.attributes"><h3>属性框架</h3><div class="tags"><el-tag v-for="attribute in selectedItem.attributes" :key="attribute" effect="plain">{{ attribute }}</el-tag></div></template>
            <template v-if="selected.key === 'relations'"><h3>关系方向</h3><p>{{ labelFor(selectedItem.source) }} → {{ labelFor(selectedItem.target) }}</p></template>
            <template v-if="selected.key === 'inputs'"><h3>输入契约</h3><dl><dt>所属对象 / 关系</dt><dd>{{ labelFor(selectedItem.scope) }}</dd><dt>计量单位</dt><dd>{{ selectedItem.unit }}</dd><dt>数据形式</dt><dd>{{ selectedItem.data_type === 'number_array' ? '数值数组' : '数值' }}</dd><dt>时间口径</dt><dd>{{ selectedItem.time_grain }}</dd><dt>输入要求</dt><dd>{{ selectedItem.required ? '必填' : '按所选指标提供' }}</dd><dt>取值范围</dt><dd>{{ selectedItem.min ?? '不限' }} ～ {{ selectedItem.max ?? '不限' }}</dd></dl><p v-if="selectedItem.sum_to_one" class="note">份额使用0至1小数，完整数组合计须为1。</p></template>
            <template v-if="selected.key === 'metrics'"><h3>输出与公式</h3><div class="formula">{{ selectedItem.expression }}</div><p>输出单位：{{ selectedItem.unit }}</p><el-tag :type="selectedItem.status === 'verified' ? 'success' : 'warning'">{{ selectedItem.status === 'verified' ? '可执行定义' : '候选 · 待人工确认' }}</el-tag><h3>依赖输入</h3><div class="tags"><el-tag v-for="dep in metricDeps(selectedItem)" :key="dep" @click="selectById(dep)">{{ labelFor(dep) }}</el-tag></div><h3>适用条件</h3><p v-for="(condition, index) in selectedItem.conditions" :key="index">{{ labelFor(condition.field) }} {{ condition.op === 'gt' ? '>' : condition.op === 'ge' ? '≥' : '≤' }} {{ condition.op === 'le_field' ? labelFor(condition.value) : condition.value }}</p><p class="note">{{ selectedItem.basis || '请确认公式及统计口径。' }}</p></template>
            <template v-if="selected.key === 'factors'"><h3>关联分析指标</h3><div class="tags"><el-tag v-for="id in selectedItem.metrics" :key="id" @click="select('metrics', id)">{{ labelFor(id) }}</el-tag></div><h3>需检查的关键因素</h3><p v-for="factor in selectedItem.qualitative" :key="factor" class="factor-line">{{ factor }}</p><h3>问题匹配词</h3><p>{{ selectedItem.keywords.join('、') }}</p></template>
            <template v-if="selected.key === 'types' || selected.key === 'relations'"><h3>属性与输入指标</h3><p class="note">包含主体自身及关联供需关系上的定义，具体数值由不同业务数据提供。</p><button v-for="field in scopedInputs" :key="field.id" class="field-link" @click="select('inputs', field.id)">{{ field.label }} <span>{{ field.unit }}</span><small>{{ labelFor(field.scope) }}</small></button><p v-if="!scopedInputs.length" class="note">可在输入目录中添加字段并指定此对象。</p><h3 v-if="relatedMetrics.length">关联输出指标</h3><div class="tags"><el-tag v-for="metric in relatedMetrics" :key="metric.id" @click="select('metrics',metric.id)">{{ metric.label }}</el-tag></div><h3 v-if="relatedRelations.length">关联关系及属性</h3><button v-for="relation in relatedRelations" :key="relation.id" class="relation-definition" @click="select('relations',relation.id)"><strong>{{ relation.label }}</strong><span>{{ labelFor(relation.source) }} → {{ labelFor(relation.target) }}</span><small>{{ relation.attributes.join(' · ') }}</small></button></template>
          </template>
          <template v-else><h2>可复用的分析架子</h2><p class="detail-description">点击节点或目录，查看它的属性、输入输出及计算规则。</p></template>
          <div class="source-section"><h3>构建依据</h3><p v-for="(source, index) in model.sources" :key="index"><a v-if="safeLink(source.source)" :href="source.source" target="_blank" rel="noopener noreferrer">{{ source.title }}</a><span v-else>{{ source.title }}</span><small>{{ source.kind === 'web_metadata' ? '网上题录线索，待核验' : '本地本体定义' }}</small></p><p v-for="warning in model.generation?.warnings || []" :key="warning" class="note">{{ warning }}</p></div>
        </aside>
      </div>
      <DomainAgentModeling v-if="!['map','agent'].includes(view)" :model="model" :instance="instance" :focus-type="selected?.key === 'types' ? selected.id : ''" :focus-entity="agentFocusEntity" @update-definitions="updateAgentDefinitions" @select="select"/>
      <section v-if="view !== 'map'" class="analysis-panel">
        <div class="analysis-head"><div><h2>从通用框架中选取本次分析范围</h2><p>① 输入问题 → ② 检索相关子图 → ③ 补充所需数据 → ④ 用于场景分析。不同问题共用框架。</p></div><el-button type="primary" plain @click="previewAnalysis" :loading="busy === 'analysis'">检索相关子图</el-button></div>
        <el-input v-model="question" placeholder="例如：零件1的一级供应商停产两周，会影响哪些环节？"/>
        <DomainRetrievalDetails :retrieval="analysis?.retrieval" />
        <div v-if="analysis" class="analysis-grid"><article v-for="factor in analysis.factors" :key="factor.id"><strong>{{ factor.label }}</strong><p>指标：{{ factor.metrics.map(labelFor).join('、') || '定性分析' }}</p><p>{{ factor.qualitative.join('；') }}</p></article></div>
        <p v-if="analysis" class="note">需要输入：{{ analysis.required_inputs.map(x => `${x.label}（${x.unit}）`).join('、') || '暂无数值输入' }}。{{ analysis.instance_results ? '已按绑定数据计算，可在数据面板查看缺失项。' : '尚未绑定数据，当前仅展示分析要求。' }}</p>
      </section>
    </template>
    <el-empty v-else-if="!busy" description="领域模型未加载"><el-button @click="loadInitial">重新加载</el-button></el-empty>

    <el-dialog v-model="owlOpen" title="OWL语义推理" width="min(780px, 94vw)">
      <p class="dialog-description">将当前框架转换为OWL本体，用HermiT检查逻辑一致性、推导类层级及关系两端的对象类型。数值公式仍由计算引擎执行。</p>
      <el-alert v-if="owlSupport" :title="owlSupport.ready ? 'HermiT运行环境已就绪' : `运行环境缺少：${owlSupport.missing.join('、')}`" :type="owlSupport.ready ? 'success' : 'warning'" :closable="false"/>
      <div class="data-actions" style="margin-top:16px"><el-button type="primary" :disabled="!owlSupport?.ready" :loading="busy === 'owl'" @click="runOwl('schema')">检查框架一致性</el-button><el-button :disabled="!owlSupport?.ready" :loading="busy === 'owl'" @click="runOwl('demo')">演示关系类型推导</el-button><el-button :disabled="!owlSupport?.library" @click="downloadOwl">导出OWL文件</el-button></div>
      <template v-if="owlResult">
        <el-alert :title="owlResult.status !== 'completed' ? owlResult.reason : !owlResult.consistent ? '本体存在逻辑冲突' : !owlResult.coherent ? '本体整体一致，但存在无法实例化的类型' : '本体一致性与类型可满足性检查通过'" :type="owlResult.status === 'completed' && owlResult.consistent && owlResult.coherent ? 'success' : 'warning'" :closable="false"/>
        <p v-if="owlResult.elapsed_seconds != null" class="note">引擎：{{ owlResult.engine }} · 实际推理耗时：{{ owlResult.elapsed_seconds }}秒</p>
        <p v-if="owlResult.unsatisfiable_classes?.length" class="input-error">需修订的类型：{{ owlResult.unsatisfiable_classes.map(labelFor).join('、') }}</p>
        <div v-if="owlResult.demo" class="scope-note"><el-tag type="warning">演示事实，非业务数据</el-tag><p v-for="fact in owlResult.input_facts" :key="fact">{{ fact }}</p></div>
        <el-table v-if="owlResult.inferred_types?.length" :data="owlResult.inferred_types" max-height="220"><el-table-column prop="subject" label="演示对象" min-width="180"/><el-table-column prop="type_label" label="推导类型" width="120"/><el-table-column prop="basis" label="依据" min-width="220"/></el-table>
        <el-table v-if="owlResult.class_hierarchy?.length" :data="owlResult.class_hierarchy" max-height="220"><el-table-column label="类型"><template #default="{row}">{{ labelFor(row.type) }}</template></el-table-column><el-table-column label="上位类型"><template #default="{row}">{{ labelFor(row.parent) }}</template></el-table-column><el-table-column label="来源"><template #default="{row}">{{ row.inferred ? '推导得到' : '框架显式定义' }}</template></el-table-column></el-table>
      </template>
      <p class="note">采用开放世界语义：缺少关系不等于关系不存在。逻辑一致不代表业务数据完整或事实已核验。</p>
    </el-dialog>

    <el-dialog v-model="maintenanceOpen" title="框架维护与修订记录" width="580px">
      <p class="dialog-description">同一框架可用于不同问题。修订记录用于追溯结构和规则的修改，已有场景继续使用提交时的快照。</p>
      <p class="note">当前框架：{{ model?.name }} · {{ model?.version ? `第 ${model.version} 次保存` : '尚未保存' }}</p>
      <el-form label-position="top"><el-form-item label="行业扩展"><el-select v-model="industry" :disabled="!!busy"><el-option label="通用底座" value="generic"/><el-option label="汽车扩展" value="auto"/><el-option label="铀行业扩展" value="uranium"/></el-select></el-form-item><el-form-item label="已有框架记录"><el-select :model-value="model?.id || ''" placeholder="当前框架" @change="loadSaved"><el-option v-for="item in compatibleModels" :key="item.id" :label="`${item.name} · 第${item.version}次保存`" :value="item.id"/></el-select></el-form-item></el-form>
      <el-button @click="modelFile.click()">导入框架</el-button><el-button @click="copyModel">创建独立扩展副本</el-button>
    </el-dialog>

    <el-dialog v-model="generatorOpen" title="生成领域模型框架" width="560px">
      <p class="dialog-description">已有本体提供基础结构，智能补全可添加输入、指标和关键因素。生成结果是可编辑草稿。</p>
      <el-form label-position="top"><el-form-item label="领域"><el-select v-model="generationIndustry"><el-option label="通用供应链" value="generic"/><el-option label="汽车供应链" value="auto"/><el-option label="铀供应链" value="uranium"/></el-select></el-form-item><el-form-item label="框架需求"><el-input v-model="generationPrompt" type="textarea" :rows="3" placeholder="例如：需要多级供需关系，重点关注售价、交付周期和替代供应能力"/></el-form-item><el-checkbox v-model="smart">使用现有大模型补充框架</el-checkbox><el-checkbox v-model="web">检索网上方法题录线索</el-checkbox><p class="note">智能生成的新增公式均标为候选，需要核验后才能执行。题录线索不代表已读取或核验全文。</p></el-form>
      <template #footer><el-button @click="generatorOpen = false">取消</el-button><el-button type="primary" @click="generate" :loading="busy === 'generate'">生成框架</el-button></template>
    </el-dialog>

    <el-dialog v-model="editorOpen" :title="`编辑${groupName(editKey)}`" width="660px">
      <el-form label-position="top" v-if="edit">
        <div class="edit-grid"><el-form-item label="名称"><el-input v-model="edit.label"/></el-form-item><el-form-item label="字段编码（英文）"><el-input v-model="edit.id" :disabled="!adding"/></el-form-item></div>
        <el-form-item label="说明及适用口径"><el-input v-model="edit.description" type="textarea" :rows="2"/></el-form-item>
        <el-form-item label="检索别名（每行一个，可选）"><el-input v-model="aliasText" type="textarea" :rows="2" placeholder="例如：供货商、进货价等常用名称，每行一项"/></el-form-item>
        <template v-if="editKey === 'types' || editKey === 'relations'"><el-form-item label="属性（每行一个）"><el-input v-model="attributeText" type="textarea" :rows="3"/></el-form-item></template>
        <template v-if="editKey === 'types'"><el-form-item label="上位类型（OWL子类公理，可选）"><el-select v-model="edit.parents" multiple style="width:100%"><el-option v-for="item in model.types.filter(x=>x.id!==edit.id)" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item><el-form-item label="互斥类型（OWL互斥公理，可选）"><el-select v-model="edit.disjoint_with" multiple style="width:100%"><el-option v-for="item in model.types.filter(x=>x.id!==edit.id)" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item></template>
        <div v-if="editKey === 'relations'" class="edit-grid"><el-form-item label="来源对象"><el-select v-model="edit.source"><el-option v-for="item in model.types" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item><el-form-item label="目标对象"><el-select v-model="edit.target"><el-option v-for="item in model.types" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item></div>
        <template v-if="editKey === 'inputs' || editKey === 'metrics'"><div class="edit-grid"><el-form-item label="所属对象或关系"><el-select v-model="edit.scope"><el-option v-for="item in [...model.types, ...model.relations]" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item><el-form-item label="单位"><el-input v-model="edit.unit" placeholder="件、天、元/件、件/天等"/></el-form-item></div></template>
        <template v-if="editKey === 'inputs'"><div class="edit-grid"><el-form-item label="数据形式"><el-select v-model="edit.data_type"><el-option label="数值" value="number"/><el-option label="数值数组" value="number_array"/></el-select></el-form-item><el-form-item label="时间口径"><el-input v-model="edit.time_grain"/></el-form-item><el-form-item label="最小值（留空为不限）"><el-input-number v-model="edit.min" :controls="false"/></el-form-item><el-form-item label="最大值（留空为不限）"><el-input-number v-model="edit.max" :controls="false"/></el-form-item></div><el-checkbox v-model="edit.required">此输入必填</el-checkbox><el-checkbox v-if="edit.data_type === 'number_array'" v-model="edit.sum_to_one">份额合计须为1</el-checkbox></template>
        <template v-if="editKey === 'metrics'"><el-form-item label="计算公式"><el-input v-model="edit.expression" placeholder="inventory / daily_demand"/></el-form-item><p class="note">使用字段编码、四则运算，以及 sum(数组字段)、sum_squares(数组字段)。</p><el-form-item label="公式依据"><el-input v-model="edit.basis"/></el-form-item><el-form-item label="执行状态"><el-select v-model="edit.status"><el-option label="候选：待核验" value="candidate"/><el-option label="已确认定义：允许执行" value="verified"/></el-select></el-form-item><p class="note">请在确认公式、单位和适用条件后允许执行。</p><h4>适用条件</h4><div v-for="(condition, index) in edit.conditions" :key="index" class="condition-row"><el-select v-model="condition.field" placeholder="字段"><el-option v-for="item in [...model.inputs, ...model.metrics]" :key="item.id" :label="item.label" :value="item.id"/></el-select><el-select v-model="condition.op" @change="condition.value = condition.op === 'le_field' ? '' : 0"><el-option label="大于" value="gt"/><el-option label="大于等于" value="ge"/><el-option label="小于等于字段" value="le_field"/></el-select><el-select v-if="condition.op === 'le_field'" v-model="condition.value"><el-option v-for="item in [...model.inputs, ...model.metrics]" :key="item.id" :label="item.label" :value="item.id"/></el-select><el-input-number v-else v-model="condition.value" :controls="false"/><el-button text type="danger" @click="edit.conditions.splice(index, 1)">删除</el-button></div><el-button text @click="edit.conditions.push({field: '', op: 'gt', value: 0})">＋ 添加条件</el-button></template>
        <template v-if="editKey === 'factors'"><el-form-item label="匹配关键词（每行一个）"><el-input v-model="keywordText" type="textarea" :rows="2"/></el-form-item><el-form-item label="关联指标"><el-select v-model="edit.metrics" multiple style="width:100%"><el-option v-for="item in model.metrics" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item><el-form-item label="需检查的定性因素（每行一个）"><el-input v-model="qualitativeText" type="textarea" :rows="3"/></el-form-item></template>
      </el-form>
      <template #footer><el-button @click="editorOpen = false">取消</el-button><el-button type="primary" @click="commitEdit" :loading="busy === 'edit'">校验并更新</el-button></template>
    </el-dialog>

    <el-dialog v-model="metaOpen" title="模型设置" width="520px"><el-form label-position="top"><el-form-item label="模型名称"><el-input v-model="metaName"/></el-form-item><el-form-item label="说明"><el-input v-model="metaDescription" type="textarea" :rows="3"/></el-form-item></el-form><template #footer><el-button @click="metaOpen = false">取消</el-button><el-button type="primary" @click="commitMeta">更新</el-button></template></el-dialog>

    <el-dialog v-model="dataOpen" title="数据输入与计算预览" width="min(1100px, 94vw)" class="data-dialog">
      <p class="dialog-description">每行是一种产品或零件在同一时间窗口的输入。多供应商报价请先按份额加权，明细数据请先聚合。单位须与模型一致；场景最多绑定100行。</p>
      <div class="data-actions"><el-button type="primary" plain @click="dataFile.click()">导入 CSV / Excel / JSON</el-button><el-button @click="downloadInputTemplate">下载输入模板</el-button><el-button :disabled="!instance" @click="clearData">清除本次输入</el-button><input ref="dataFile" type="file" accept=".csv,.xlsx,.xls,.json" hidden @change="importData"/><span>{{ instance ? `${instance.rows.length} 行 · ${columns.length} 列` : '尚未导入数据' }}</span><el-button :disabled="!instance" @click="calculate" :loading="busy === 'compute'">校验并计算</el-button></div>
      <template v-if="instance"><el-tabs v-model="dataTab"><el-tab-pane label="字段映射" name="mapping"><el-table :data="model.inputs" max-height="390"><el-table-column prop="label" label="模型输入" min-width="140"/><el-table-column label="数据列" min-width="200"><template #default="{row}"><el-select v-model="instance.mapping[row.id]" clearable placeholder="未映射" style="width:100%"><el-option v-for="column in columns" :key="column" :label="column" :value="column"/></el-select></template></el-table-column><el-table-column label="导入单位" width="135"><template #default="{row}"><el-input v-model="instance.units[row.id]"/></template></el-table-column><el-table-column prop="unit" label="要求单位" width="105"/><el-table-column prop="description" label="口径" min-width="220"/></el-table><p class="note">未映射字段保持缺失，不会自动填0。供货份额数组可用JSON形式，例如 [0.6,0.4]；1表示0至1比例。</p></el-tab-pane><el-tab-pane label="输入数据" name="rows"><el-table :data="instance.rows.slice(0, 100)" max-height="390"><el-table-column v-for="column in columns" :key="column" :prop="column" :label="column" min-width="130"/></el-table><p class="note">展示前100行，计算最多支持1000行。</p></el-tab-pane><el-tab-pane label="计算结果与缺失项" name="results"><el-table :data="outputRows" max-height="430"><el-table-column prop="object" label="对象" min-width="110"/><el-table-column prop="label" label="指标" min-width="140"/><el-table-column label="结果" width="120"><template #default="{row}">{{ row.value == null ? '—' : Number(row.value.toFixed(6)) }}</template></el-table-column><el-table-column prop="unit" label="单位" width="100"/><el-table-column label="状态 / 待补输入" min-width="220"><template #default="{row}"><el-tag :type="row.status === 'computed' ? 'success' : 'warning'">{{ statusLabels[row.status] }}</el-tag> {{ row.missing?.map(labelFor).join('、') || row.reason }}</template></el-table-column></el-table><div v-for="row in results?.rows || []" :key="row.row"><p v-if="Object.keys(row.input_errors).length" class="input-error">{{ row.object }}：{{ Object.entries(row.input_errors).map(([id, text]) => `${labelFor(id)}：${text}`).join('；') }}</p></div><p v-if="!results" class="note">请点击“校验并计算”，查看结果。</p></el-tab-pane></el-tabs></template>
      <template #footer><el-button @click="dataOpen = false">完成</el-button></template>
    </el-dialog>

    <el-dialog v-model="validationOpen" title="框架校验" width="560px"><el-alert :type="validation?.valid ? 'success' : 'error'" :title="validation?.valid ? '结构、引用、单位和计算依赖校验通过' : '请修正以下问题'" :closable="false"/><p v-for="message in validation?.errors || []" :key="message" class="input-error">{{ message }}</p><p v-for="message in validation?.warnings || []" :key="message" class="note">{{ message }}</p></el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { listDomainModels, getDomainTemplate, getDomainModel, generateDomainModel, validateDomainModel, saveDomainModel, computeDomainModel, analyzeDomainModel } from '@/api/domainModel'
import { readDomainBinding } from '@/utils/domainModelBinding'
import { useScenarioStore } from '@/stores/scenario'

import DomainRetrievalDetails from '@/components/SCnet/DomainRetrievalDetails.vue'
import DomainSupplyNetwork from '@/components/SCnet/DomainSupplyNetwork.vue'
import DomainAgentModeling from '@/components/SCnet/DomainAgentModeling.vue'
import DomainEnvironmentModel from '@/components/SCnet/DomainEnvironmentModel.vue'
import { buildUraniumWorld } from '@/utils/domainWorldModel'
import { getSharedDomainModel } from '@/api/domainModel'
import { getOwlCapabilities, reasonDomainOwl, exportDomainOwl } from '@/api/domainModel'

const route = useRoute(), scenarioStore = useScenarioStore()
const model = ref(null), catalog = ref([]), busy = ref(''), error = ref(''), dirty = ref(false)
const industry = ref('generic')
const maintenanceOpen = ref(false)
const owlOpen = ref(false), owlSupport = ref(null), owlResult = ref(null)
const agentFocusEntity=ref('')
const mapCatalog=ref(false), mapDetails=ref(false)
const selected = ref(null), search = ref(''), view = ref('map'), canvas = ref(null)
watch(view,value=>{if(value==='world')view.value='map'},{immediate:true})
const modelFile = ref(null), dataFile = ref(null)
const generatorOpen = ref(false), generationIndustry = ref(industry.value), generationPrompt = ref(''), smart = ref(false), web = ref(false)
const editorOpen = ref(false), editKey = ref(''), edit = ref(null), adding = ref(false), attributeText = ref(''), keywordText = ref(''), qualitativeText = ref('')
const aliasText = ref('')
const metaOpen = ref(false), metaName = ref(''), metaDescription = ref('')
const dataOpen = ref(false), dataTab = ref('mapping'), instance = ref(null), results = ref(null)
const question = ref(''), analysis = ref(null), validation = ref(null), validationOpen = ref(false)
const groups = [{key:'types',label:'对象类型',color:'#3b82f6'}, {key:'relations',label:'关系结构',color:'#64748b'}, {key:'inputs',label:'输入字段',color:'#14b8a6'}, {key:'metrics',label:'输出指标',color:'#8b5cf6'}, {key:'factors',label:'分析因素',color:'#f59e0b'}]
const viewDescriptions = {world:'世界边界、时间轴、业务网络与状态更新顺序',environment:'领域参数 → 环境约束 → Agent感知与决策输入',agent:'定义事中Agent的状态、动作、规则、约束和交互；仅作事前建模输入',map:'供应国家 → 交易、运输与加工 → 需求主体；点击节点进入分类资料档案',structure:'多级供货 · 多级制造 · 物料组成 · 分销需求 · 仓储回收；虚线为类型继承',metrics:'对象、输入与输出的关联',dependency:'输入 → 计算指标 → 分析因素',subgraph:'沿已定义的本体关系检索，并完整保留指标所需输入'}
const statusLabels = {computed:'已计算',missing:'待补数据',candidate:'公式待确认',invalid:'条件不满足'}
const clone = value => JSON.parse(JSON.stringify(value))
let chart, resizeObserver, loadingIndustry = false
const compatibleModels = computed(() => catalog.value.filter(x => x.industry === industry.value))
const selectedItem = computed(() => selected.value ? model.value?.[selected.value.key]?.find(x => x.id === selected.value.id) : null)
const selectedScopes = computed(() => {
  const scopes = new Set([selectedItem.value?.id])
  const visit = id => { for (const parent of model.value?.types.find(x=>x.id===id)?.parents || []) if (!scopes.has(parent)) { scopes.add(parent); visit(parent) } }
  if (selected.value?.key === 'types') visit(selectedItem.value?.id)
  return scopes
})
const relatedRelations = computed(() => selected.value?.key === 'types' ? model.value?.relations.filter(x=>selectedScopes.value.has(x.source) || selectedScopes.value.has(x.target)) || [] : [])
const scopedInputs = computed(() => { const scopes=new Set([...selectedScopes.value,...relatedRelations.value.map(x=>x.id)]); return model.value?.inputs.filter(x=>scopes.has(x.scope)) || [] })
const relatedMetrics = computed(() => { const ids=new Set(scopedInputs.value.map(x=>x.id)); return model.value?.metrics.filter(x=>metricDeps(x).some(id=>ids.has(id))) || [] })
const columns = computed(() => [...new Set((instance.value?.rows || []).flatMap(row => Object.keys(row)))])
const outputRows = computed(() => (results.value?.rows || []).flatMap(row => Object.values(row.outputs).map(output => ({...output, object:row.object}))))
const computedCount = computed(() => outputRows.value.filter(x => x.status === 'computed').length)
function groupName(key) { return groups.find(x => x.key === key)?.label || '模型' }
function filtered(key) { return model.value[key].filter(x => `${x.label} ${x.id}`.toLowerCase().includes(search.value.toLowerCase())) }
function select(key, id, entityId='') { selected.value = {key, id}; agentFocusEntity.value=entityId; if (view.value === 'map') mapDetails.value=true }
function updateEnvironment(value) { model.value={...model.value,environment_model:value}; dirty.value=true; localStorage.setItem('scnet-domain-environment:'+model.value.id,JSON.stringify(value)) }
function updateWorld(value) { model.value={...model.value,world_model:value}; dirty.value=true; localStorage.setItem('scnet-domain-world:'+model.value.id,JSON.stringify(value)) }
function updateAgentDefinitions(value) { model.value={...model.value,agent_definitions:value}; dirty.value=true; try { localStorage.setItem('scnet-agent-definition-draft:'+model.value.id,JSON.stringify(value)) } catch { /* The current page draft remains editable. */ } }
function bindAgentRows(rows) { instance.value={rows,mapping:{},units:{}}; try { sessionStorage.setItem('scnet-agent-instance-draft:'+model.value.id+':'+model.value.version,JSON.stringify(instance.value)) } catch { /* Retain the current page binding. */ } agentFocusEntity.value=''; ElMessage.success('已更新供需实例；Agent状态绑定将在下方同步检查') }
function selectById(id) { const group = groups.find(g => model.value[g.key].some(x => x.id === id)); if (group) select(group.key, id) }
function labelFor(id) { for (const group of groups) { const item = model.value?.[group.key]?.find(x => x.id === id); if (item) return item.label } return id }
function metricDeps(item) { return [...new Set((item.expression?.match(/[A-Za-z][A-Za-z0-9_]*/g) || []).filter(x => !['sum','sum_squares'].includes(x)))] }
function safeLink(url) { return /^https?:\/\//i.test(url || '') }
function lines(text) { return [...new Set(text.split('\n').map(x => x.trim()).filter(Boolean))] }
async function run(name, action) { if (busy.value) return; busy.value = name; error.value = ''; try { return await action() } catch (e) { error.value = e?.message || '操作失败'; ElMessage.error(error.value) } finally { busy.value = '' } }
async function confirmReplace() { if (!dirty.value && !instance.value) return true; try { await ElMessageBox.confirm('当前框架或输入数据将被替换，已保存版本仍可加载。', '替换当前工作区', {type:'warning'}); return true } catch { return false } }
function setModel(value, bound = null) { value.world_model=value.world_model||buildUraniumWorld(); try { value.environment_model=JSON.parse(localStorage.getItem('scnet-domain-environment:'+value.id)||'null')||value.environment_model; value.world_model=JSON.parse(localStorage.getItem('scnet-domain-world:'+value.id)||'null')||value.world_model } catch { /* Keep framework defaults. */ } if ((value.world_model?.data_revision||0)<3) value.world_model={...value.world_model,...buildUraniumWorld()}; try { const draft=JSON.parse(localStorage.getItem('scnet-agent-definition-draft:'+value.id)||'null'); if(draft) value.agent_definitions=draft } catch { /* Ignore an unreadable local draft. */ } model.value = value; selected.value = value.types.length ? {key:'types', id:value.types.find(x => x.id === 'part')?.id || value.types[0].id} : null; instance.value = bound; if (!bound) { try { instance.value=JSON.parse(sessionStorage.getItem('scnet-agent-instance-draft:'+value.id+':'+value.version)||'null') } catch { /* Retain an unbound view. */ } } if (!instance.value?.rows?.length || instance.value.rows.some(x=>x.data_status==='demo') || instance.value.rows.every(x=>x.network_basis==='uranium_reference')) instance.value={rows:value.world_model.nodes,mapping:{},units:{}}; results.value = null; analysis.value = null; dirty.value = false; }
async function refreshCatalog() { catalog.value = await listDomainModels() }
async function loadInitial() { await run('load', async () => { await refreshCatalog(); const binding = readDomainBinding(scenarioStore.isSupplyChain ? 'auto' : 'uranium'); if (route.query.model_id) { const value = await getDomainModel(String(route.query.model_id), Number(route.query.version) || undefined); loadingIndustry = true; industry.value = value.industry; setModel(value, binding?.model_id === value.id && binding.version === value.version ? binding.instance : null); await nextTick(); loadingIndustry = false } else if (industry.value === 'generic') setModel(await getSharedDomainModel(), binding?.model_id === 'shared_supply_chain' ? binding.instance : null); else setModel(await getDomainTemplate(industry.value)); }) }
async function loadSaved(id) { if (!await confirmReplace()) return; await run('load', async () => setModel(await getDomainModel(id))) }
watch(industry, async (value, old) => { if (loadingIndustry) return; if (!await confirmReplace()) { loadingIndustry = true; industry.value = old; await nextTick(); loadingIndustry = false; return } generationIndustry.value = value; await loadInitial() })
async function generate() { if (!await confirmReplace()) return; await run('generate', async () => { const value = await generateDomainModel({industry:generationIndustry.value, prompt:generationPrompt.value, smart:smart.value, web:web.value}); if (value.industry === 'generic') { const shared=await getSharedDomainModel(); value.id=shared.id; value.version=shared.version } loadingIndustry = true; industry.value = generationIndustry.value; setModel(value); dirty.value = true; await nextTick(); loadingIndustry = false; generatorOpen.value = false; ElMessage.success('框架草稿已生成，可编辑后保存'); }) }
async function persist() { model.value = await saveDomainModel(model.value); dirty.value = false; await refreshCatalog(); return model.value }
async function save() { await run('save', async () => { await persist(); ElMessage.success('框架已保存，可继续用于不同问题') }) }
async function check() { await run('check', async () => { validation.value = await validateDomainModel(model.value); validationOpen.value = true }) }
async function openOwl() { owlOpen.value=true; await run('owl-capabilities',async()=>{owlSupport.value=await getOwlCapabilities()}) }
async function runOwl(mode) { await run('owl',async()=>{owlResult.value=null;owlResult.value=await reasonDomainOwl(model.value,mode)}) }
async function downloadOwl() { await run('owl-export',async()=>{const result=await exportDomainOwl(model.value);if(result.status!=='exported')throw new Error(result.reason || 'OWL导出失败');download('供应链领域框架.owl',result.content,'application/rdf+xml')}) }
function download(filename, content, type='application/json') { const url = URL.createObjectURL(new Blob([content], {type})); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url) }
function exportModel() { download(`${model.value.name}.json`, JSON.stringify(model.value, null, 2)) }
async function importModel(event) { const file = event.target.files[0]; event.target.value = ''; if (!file || !await confirmReplace()) return; await run('load', async () => { if (file.size > 2e6) throw new Error('模型文件不能超过2MB'); const candidate = JSON.parse(await file.text()); const check = await validateDomainModel(candidate); if (!check.valid) throw new Error(check.errors.join('；')); candidate.id = ''; candidate.version = 0; loadingIndustry = true; industry.value = candidate.industry; setModel(candidate); dirty.value = true; await nextTick(); loadingIndustry = false; ElMessage.success('模型已导入为新草稿') }) }
function copyModel() { model.value.id = ''; model.value.version = 0; dirty.value = true; ElMessage.success('已复制为新模型，保存后获得独立版本') }
function editMeta() { metaName.value = model.value.name; metaDescription.value = model.value.description; metaOpen.value = true }
function commitMeta() { if (!metaName.value.trim()) return ElMessage.warning('请输入模型名称'); model.value.name = metaName.value.trim(); model.value.description = metaDescription.value; dirty.value = true; metaOpen.value = false }
function openEditor(key, value, isNew) { editKey.value = key; edit.value = clone(value); adding.value = isNew; attributeText.value = value.attributes?.join('\n') || ''; keywordText.value = value.keywords?.join('\n') || ''; qualitativeText.value = value.qualitative?.join('\n') || ''; aliasText.value=value.aliases?.join('\n') || ''; editorOpen.value = true }
function editItem() { openEditor(selected.value.key, selectedItem.value, false) }
function addItem(key) { const value = {id:'',label:'',description:''}; if (['types','relations'].includes(key)) value.attributes = []; if (key === 'relations') Object.assign(value,{source:model.value.types[0]?.id,target:model.value.types[0]?.id}); if (['inputs','metrics'].includes(key)) Object.assign(value,{scope:'part',unit:'1',data_type:'number'}); if (key === 'inputs') Object.assign(value,{time_grain:'同一分析窗口',required:false,min:null,max:null}); if (key === 'metrics') Object.assign(value,{expression:'',status:'candidate',conditions:[],basis:''}); if (key === 'factors') Object.assign(value,{keywords:[],metrics:[],qualitative:[]}); openEditor(key,value,true) }
async function commitEdit() { await run('edit', async () => { const value = clone(edit.value); value.aliases = lines(aliasText.value); if (['types','relations'].includes(editKey.value)) value.attributes = lines(attributeText.value); if (editKey.value === 'factors') Object.assign(value,{keywords:lines(keywordText.value),qualitative:lines(qualitativeText.value)}); const candidate = clone(model.value); if (adding.value) candidate[editKey.value].push(value); else candidate[editKey.value] = candidate[editKey.value].map(x => x.id === value.id ? value : x); const check = await validateDomainModel(candidate); if (!check.valid) throw new Error(check.errors.join('；')); model.value = candidate; selected.value = {key:editKey.value,id:value.id}; dirty.value = true; editorOpen.value = false; }) }
async function removeItem() { try { await ElMessageBox.confirm(`删除“${selectedItem.value.label}”？有关联引用时会阻止删除。`, '删除定义', {type:'warning'}) } catch { return } await run('edit',async () => { const candidate = clone(model.value); candidate[selected.value.key] = candidate[selected.value.key].filter(x => x.id !== selected.value.id); const check = await validateDomainModel(candidate); if (!check.valid) throw new Error(check.errors.join('；')); model.value = candidate; selected.value = null; dirty.value = true }) }
async function importData(event) { const file = event.target.files[0]; event.target.value = ''; if (!file) return; await run('load', async () => { if (file.size > 5e6) throw new Error('输入文件不能超过5MB'); let rows; if (file.name.toLowerCase().endsWith('.json')) { const parsed = JSON.parse(await file.text()); rows = Array.isArray(parsed) ? parsed : parsed.rows } else { const book = XLSX.read(await file.arrayBuffer(), {type:'array'}); rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {defval:''}) } if (!Array.isArray(rows) || !rows.length || rows.length > 1000 || rows.some(x => !x || typeof x !== 'object' || Array.isArray(x))) throw new Error('需要1至1000行对象数据'); const headers = Object.keys(rows[0]); const mapping = {}, units = {}; for (const field of model.value.inputs) { mapping[field.id] = headers.includes(field.id) ? field.id : headers.includes(field.label) ? field.label : ''; units[field.id] = field.unit } instance.value = {rows,mapping,units}; results.value = null; analysis.value = null; dataTab.value = 'mapping'; ElMessage.success('已导入，请核对字段映射和单位'); }) }
function downloadInputTemplate() { const header = ['object', ...model.value.inputs.map(x => x.id)]; download('领域模型输入模板.csv', '\uFEFF' + header.join(',') + '\n', 'text/csv;charset=utf-8') }
function clearData() { instance.value = null; results.value = null; analysis.value = null }
async function calculate() { await run('compute', async () => { results.value = await computeDomainModel(model.value, instance.value); dataTab.value = 'results'; ElMessage.success('已计算有效指标，缺失和无效输入已标记') }) }
async function previewAnalysis() { await run('analysis', async () => { analysis.value = await analyzeDomainModel(model.value, question.value, instance.value); view.value='subgraph' }) }

function graphData() {
  const nodes = [], links = []
  const node = (id,label,type,key,itemId,description='') => nodes.push({id,name:label,nodeType:type,key,itemId,description})
  const link = (source,target,label='') => links.push({source,target,label:{show:!!label,formatter:label},lineStyle:{color:'#94a3b8'}})
  if (view.value === 'subgraph') {
    const retrieval=analysis.value?.retrieval
    if (!retrieval) return {nodes,links}
    for (const item of retrieval.nodes) node(item.id,item.unit ? `${item.label}\n${item.unit}` : item.label,item.kind,item.kind,item.id,item.reasons.join('；'))
    for (const edge of retrieval.edges) links.push({source:edge.source,target:edge.target,name:edge.label,label:{show:false},lineStyle:{color:'#64748b'}})
    return {nodes,links}
  }
  if (view.value === 'structure') {
    // Role cards project reusable types; companies and tier counts are data bindings.
    const slots = [
      ['supplier3','三级 / 更上游供应商\n来源 · 资质 · 供货约束','supplier','upstream'],
      ['supplier2','二级供应商\n产能 · 报价 · 交期','supplier','upstream'],
      ['supplier1','一级供应商\n供货份额 · 质量 · 交期','supplier','upstream'],
      ['raw_material','原材料\n材质 · 品级 · 来源','raw_material','product'],
      ['component','零部件\n规格 · 接口 · 认证','component','product'],
      ['assembly','组件 / 半成品\n物料清单 · 装配要求','assembly','product'],
      ['finished_product','成品\n型号 · 配置 · 质保','finished_product','product'],
      ['part','零件 / 产品通用类型\n可绑定零件1、零件2…','part','product'],
      ['manufacturer3','三级 / 更上游制造商\n原料加工 · 产能 · 周期','manufacturer','supplier'],
      ['manufacturer2','二级制造商\n零部件制造 · 加工周期','manufacturer','supplier'],
      ['manufacturer1','一级制造商 / 整机厂\n组件装配 · 成品制造','manufacturer','supplier'],
      ['demander1','一级需求商\n需求量 · 售价 · 周期','demander','demander'],
      ['demander2','二级 / 更下游需求商\n下游需求 · 履约约束','demander','demander'],
      ['distributor','分销商\n渠道 · 补货 · 价格','distributor','demander'],
      ['retailer','零售商\n销量 · 价格 · 周期','retailer','demander'],
      ['end_customer','终端客户\n需求偏好 · 服务要求','end_customer','demander'],
      ['logistics','运输服务商\n线路 · 运费 · 时效','logistics','downstream'],
      ['warehouse','仓储中心\n库存 · 容量 · 库龄','warehouse','downstream'],
      ['recycler','回收 / 再制造商\n回收标准 · 再制造工艺','recycler','downstream'],
    ].map(([id,label,type,band])=>({id,label,type,band}))
    const ids = new Set(model.value.types.map(x=>x.id))
    for (const slot of slots.filter(s=>ids.has(s.type))) node(slot.id,slot.label,slot.band,'types',slot.type)
    for (const item of model.value.types.filter(x=>!slots.some(s=>s.type===x.id))) node(item.id,item.label,'downstream','types',item.id)
    const endpoints = {supplier:['supplier3','supplier2','supplier1'],manufacturer:['manufacturer3','manufacturer2','manufacturer1'],demander:['demander1','demander2']}
    const present = new Set(nodes.map(x=>x.id))
    const edge = (source,target,rel) => { if (present.has(source) && present.has(target)) links.push({source,target,relationId:rel.id,name:rel.label,label:{show:false},lineStyle:{color:'#94a3b8',curveness:source===target ? .4 : .08}}) }
    for (const rel of model.value.relations) {
      if (rel.source===rel.target && endpoints[rel.source]) {
        const chain=endpoints[rel.source]; for (let i=0;i<chain.length-1;i++) edge(chain[i],chain[i+1],rel)
      } else if (rel.id==='bom') {
        edge('finished_product','assembly',rel); edge('assembly','component',rel); edge('component','raw_material',rel)
      } else {
        const manufacturing = {material_processing:'manufacturer3',component_production:'manufacturer2',assembly_production:'manufacturer1',finished_production:'manufacturer1'}
        edge(manufacturing[rel.id] || endpoints[rel.source]?.at(-1) || rel.source,endpoints[rel.target]?.[0] || rel.target,rel)
      }
    }
    // Show specialization as ontology edges, distinct from operational relations.
    for (const type of model.value.types) for (const parent of type.parents || []) {
      const source=endpoints[parent]?.at(-1) || parent
      if (present.has(source) && present.has(type.id)) links.push({source,target:type.id,name:'类型继承',label:{show:false},lineStyle:{type:'dashed',color:'#cbd5e1',opacity:.5,curveness:-.1}})
    }

  } else {
    if (view.value === 'metrics') for (const type of model.value.types) node(type.id,type.label,'types','types',type.id)
    for (const field of model.value.inputs) { node(field.id,`${field.label}\n${field.unit}`,'inputs','inputs',field.id); if (view.value === 'metrics') { const scope = model.value.types.some(x=>x.id===field.scope) ? field.scope : model.value.relations.find(x=>x.id===field.scope)?.target; if (scope) link(scope,field.id) } }
    for (const metric of model.value.metrics) { node(metric.id,`${metric.label}\n${metric.unit}`,'metrics','metrics',metric.id); for (const dep of metricDeps(metric)) link(dep,metric.id) }
    for (const factor of model.value.factors) { node(factor.id,factor.label,'factors','factors',factor.id); for (const metric of factor.metrics) link(metric,factor.id) }
  }
  return {nodes,links}
}
function drawGraph() {
  if (!canvas.value || !model.value || ['map','agent','world','environment'].includes(view.value)) return
  if (!chart) { chart = echarts.init(canvas.value); chart.on('click', params => { if (params.dataType === 'edge' && params.data.relationId) select('relations',params.data.relationId); else if (params.data?.key) select(params.data.key,params.data.itemId) }) }
  const {nodes,links} = graphData()
  const order = view.value === 'structure' ? [['upstream'],['supplier'],['product'],['demander'],['downstream']] : [['types'],['relations'],['inputs'],['metrics'],['factors']]
  const width = Math.max(canvas.value.clientWidth,400)
  let positions
  if (view.value === 'structure') {
    const height = Math.max(700,Math.max(...order.map(types=>nodes.filter(n=>types.includes(n.nodeType)).length))*112+100)
    canvas.value.style.height = `${height}px`
    positions = {}
    order.forEach((types,column)=>{
      const items=nodes.filter(n=>types.includes(n.nodeType))
      items.forEach((item,row)=>{positions[item.id]={x:(column+.5)*width/5-width/2,y:60+row*(height-120)/Math.max(items.length-1,1)-height/2}})
    })
  } else {
    // The shared ontology helper uses 30px rows for text labels. These cards
    // need measured 64px rows so field names and units never overlap.
    const columns = Math.max(1,Math.floor((width-48)/132))
    const bands = order.map(types => nodes.filter(n => types.includes(n.nodeType))).filter(items=>items.length)
    const height = Math.max(600,bands.reduce((total,items)=>total+Math.ceil(items.length/columns)*64+66,0)+36)
    canvas.value.style.height = `${height}px`
    positions = {}; let top=36
    for (const items of bands) {
      const cols=Math.min(columns,items.length), cellWidth=(width-48)/cols
      items.forEach((item,index)=>{positions[item.id]={x:24+cellWidth*((index%cols)+0.5)-width/2,y:top+Math.floor(index/cols)*64+24-height/2}})
      top+=Math.ceil(items.length/cols)*64+66
    }
  }
  chart.resize()
  const colors = {upstream:'#60a5fa',supplier:'#3b82f6',product:'#2563eb',demander:'#0ea5e9',downstream:'#38bdf8',types:'#3b82f6',relations:'#64748b',inputs:'#14b8a6',metrics:'#8b5cf6',factors:'#f59e0b'}
  chart.setOption({animationDuration:350,tooltip:{trigger:'item',formatter:params => echarts.format.encodeHTML(params.data?.name || params.data?.relationId || '')},series:[{type:'graph',layout:'none',roam:true,scaleLimit:{min:.4,max:3},edgeSymbol:['none','arrow'],edgeSymbolSize:8,data:nodes.map(n=>({...n,...positions[n.id],symbol:'roundRect',symbolSize:view.value==='structure'?[132,54]:[115,46],itemStyle:{color:colors[n.nodeType],borderColor:selected.value?.id===n.itemId?'#0f172a':'#fff',borderWidth:selected.value?.id===n.itemId?3:1},label:{show:true,color:'#fff',fontSize:10,lineHeight:17}})),links,lineStyle:{width:1.4,opacity:.75},label:{show:true},emphasis:{focus:'adjacency',lineStyle:{width:3}}}]},true)
}
function resetGraph() { if (chart) chart.dispose(); chart = null; drawGraph() }
watch([model,view,selected,analysis], () => nextTick(drawGraph), {deep:true})
watch(model, () => { results.value = null; analysis.value = null; owlResult.value = null }, {deep:true})
watch(instance, () => { results.value = null; analysis.value = null }, {deep:true})
watch(question, () => { analysis.value = null })
onMounted(async () => { await loadInitial(); await nextTick(); drawGraph(); resizeObserver = new ResizeObserver(() => { chart?.resize(); drawGraph() }); if (canvas.value) resizeObserver.observe(canvas.value) })
onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose() })
onBeforeRouteLeave(async () => { if (!dirty.value) return true; try { await ElMessageBox.confirm('当前框架有未保存修改。离开后这些修改将丢失。', '离开领域模型', {type:'warning',confirmButtonText:'离开',cancelButtonText:'继续编辑'}); return true } catch { return false } })
</script>

<style scoped>
.domain-action-bar {
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin: 20px -24px -24px;
  padding: 12px 28px;
  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(6px);
  --el-color-primary: #2563eb;
  --el-border-radius-base: 8px;
  --el-component-size: 38px;
}
@media (max-width: 1300px) {
  .domain-action-bar { margin: 20px -18px -18px; }
}
@media (max-width: 640px) {
  .domain-action-bar { margin: 20px -12px -12px; padding: 12px 16px; }
}
.domain-page{padding:24px;background:#f4f7fb;min-height:100%;color:#24344d;font-size:14px}.analysis-head p{color:#64748b;margin:0;line-height:1.7}.notice{margin-bottom:14px}.toolbar{display:flex;align-items:center;gap:12px;padding:8px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:12px 12px 0 0}.toolbar .el-button+.el-button{margin-left:0}.version{font-size:12px;white-space:nowrap;color:#64748b}.version i{font-style:normal;color:#b45309}.workspace{display:grid;grid-template-columns:218px minmax(350px,1fr) 286px;border:1px solid #e2e8f0;border-top:0;background:#fff;border-radius:0 0 12px 12px;overflow:hidden;min-height:700px}.catalog{padding:18px 12px;background:#fafcff;border-right:1px solid #e2e8f0;max-height:820px;overflow:auto}.catalog-title{display:flex;align-items:center;justify-content:space-between;font-weight:600;margin:0 4px 12px}.search{margin-bottom:12px}.catalog-group{margin-bottom:14px}.group-head{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:12px;padding:4px 6px}.group-head small{color:#94a3b8;margin-left:5px}.group-head button{border:0;background:transparent;color:#64748b;font-size:20px;cursor:pointer}.catalog-item{display:flex;align-items:center;gap:8px;width:100%;background:transparent;border:0;border-radius:6px;padding:9px 7px;cursor:pointer;color:#334155;text-align:left;font-size:12px}.catalog-item:hover,.catalog-item.active{background:#eaf2ff;color:#2563eb}.catalog-item small{color:#b45309;font-size:10px;margin-left:auto}.item-dot{height:7px;width:7px;flex-shrink:0;border-radius:50%}.catalog-foot{font-size:11px;line-height:1.8;color:#94a3b8;padding:12px 6px;border-top:1px solid #e2e8f0}.network-panel{display:flex;flex-direction:column;min-width:0}.network-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid #edf2f7}.network-head strong{display:block;font-size:15px}.network-head span{display:block;font-size:11px;color:#94a3b8;margin-top:6px}.network-canvas{height:600px;min-height:500px;background-color:#f8fbff;background-image:radial-gradient(#cbd8e8 .8px,transparent .8px);background-size:20px 20px}.network-footer{padding:8px 16px;display:flex;gap:14px;align-items:center;color:#64748b;font-size:10px;border-top:1px solid #edf2f7}.network-footer span{display:flex;align-items:center;gap:5px}.network-footer i{height:7px;width:7px;border-radius:50%;display:inline-block}.network-footer .el-button{margin-left:auto}.input-banner{padding:16px 18px;background:#eff6ff;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto}.input-banner strong{font-size:13px}.input-banner p{font-size:11px;color:#64748b;line-height:1.7;margin-bottom:0}.details{padding:22px 18px;border-left:1px solid #e2e8f0;overflow:auto;max-height:820px}.detail-kicker{font-size:11px;color:#2563eb}.details h2{font-size:19px;line-height:1.5;margin:10px 0}.details code{font-size:11px;color:#64748b;background:#f1f5f9;padding:3px 6px;word-break:break-all}.detail-description{color:#64748b;line-height:1.9;font-size:12px;margin:15px 0}.detail-actions{display:flex;gap:10px;margin:12px 0}.details h3{font-size:12px;margin:22px 0 11px;color:#475569}.details p{font-size:12px;line-height:1.8}.tags{display:flex;flex-wrap:wrap;gap:7px}.tags .el-tag{max-width:100%;white-space:normal;height:auto;line-height:1.7;cursor:pointer}.formula{padding:12px;background:#f3f0ff;border:1px solid #e9d5ff;border-radius:8px;color:#6d28d9;font-family:monospace;font-size:12px;overflow-wrap:anywhere}.details dl{display:grid;grid-template-columns:92px 1fr;gap:10px;font-size:11px;line-height:1.6}.details dt{color:#94a3b8}.details dd{margin:0;word-break:break-word}.field-link{display:block;width:100%;border:0;background:#f8fafc;text-align:left;padding:10px;margin:6px 0;border-radius:6px;font-size:12px;cursor:pointer;color:#334155}.field-link small{display:block;color:#94a3b8;font-size:10px;margin-top:5px}.relation-definition{display:block;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:10px;margin:8px 0;text-align:left;cursor:pointer}.relation-definition strong{font-size:12px;color:#334155}.relation-definition span,.relation-definition small{display:block;color:#64748b;font-size:11px;line-height:1.8;margin-top:3px}.field-link span{float:right;color:#94a3b8}.source-section{margin-top:24px;border-top:1px solid #e2e8f0}.source-section small{display:block;color:#94a3b8;font-size:10px}.source-section a{color:#2563eb}.factor-line{border-left:2px solid #fbbf24;padding-left:9px}.analysis-panel{margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:20px}.analysis-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.analysis-head h2{font-size:16px;margin:0 0 7px}.analysis-head p{font-size:12px}.analysis-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px}.analysis-grid article{background:#f8fafc;padding:14px;border:1px solid #e2e8f0;border-radius:8px}.analysis-grid strong{font-size:13px}.analysis-grid p{font-size:12px;line-height:1.8;color:#64748b}.note{font-size:12px;color:#64748b;line-height:1.8}.dialog-description{color:#64748b;font-size:13px;line-height:1.8;margin-top:0}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.edit-grid .el-select,.edit-grid .el-input-number{width:100%}.condition-row{display:grid;grid-template-columns:1fr 1fr 1fr 48px;gap:8px;margin-bottom:10px}.condition-row .el-input-number{width:100%}.data-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}.data-actions span{margin-left:auto;color:#64748b;font-size:12px}.input-error{color:#b91c1c;font-size:12px;line-height:1.8}@media(max-width:1300px){.domain-page{padding:18px}.workspace{grid-template-columns:180px minmax(300px,1fr) 245px}.toolbar{flex-wrap:wrap}.network-head{flex-wrap:wrap}.network-footer{gap:8px}.network-footer span{font-size:9px}}@media(max-width:1000px){.workspace{grid-template-columns:160px minmax(0,1fr)}.details{grid-column:1/-1;max-height:none;border-top:1px solid #e2e8f0;border-left:0}.network-canvas{height:520px}.catalog{max-height:700px}}@media(max-width:640px){.workspace{grid-template-columns:1fr}.catalog{max-height:200px;border-right:0;border-bottom:1px solid #e2e8f0}.network-canvas{height:500px}.input-banner{flex-wrap:wrap}.network-footer{flex-wrap:wrap}.edit-grid{grid-template-columns:1fr}.domain-page{padding:12px}.condition-row{grid-template-columns:1fr 1fr}.analysis-head{flex-wrap:wrap}}
.workspace.map-workspace{grid-template-columns:minmax(0,1fr)}.map-workspace:not(.map-catalog-visible)>.catalog{display:none}.map-workspace:not(.map-details-visible)>.details{display:none}.workspace.map-workspace.map-details-visible{grid-template-columns:minmax(0,1fr) 286px}.workspace.map-workspace.map-catalog-visible{grid-template-columns:200px minmax(0,1fr)}.workspace.map-workspace.map-catalog-visible.map-details-visible{grid-template-columns:200px minmax(0,1fr) 286px}.map-panel-actions{display:flex;justify-content:flex-end;padding:4px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.map-workspace .network-footer{display:none}@media(max-width:900px){.workspace.map-workspace.map-details-visible,.workspace.map-workspace.map-catalog-visible,.workspace.map-workspace.map-catalog-visible.map-details-visible{grid-template-columns:minmax(0,1fr)}.map-workspace>.details,.map-workspace>.catalog{grid-column:1/-1}}
</style>
