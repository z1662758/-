<template>
  <main class="seminar-page">
    <div class="seminar-wrap">
      <nav class="module-nav" aria-label="专家研讨系统导航">
        <strong>供应链专家研讨系统</strong>
        <button type="button" :class="{ active: screen === 'home' }" @click="showScreen('home')">首页</button>
        <button type="button" :class="{ active: ['hall', 'create', 'detail', 'report'].includes(screen) }" @click="backToHall">研讨厅</button>
        <button type="button" :class="{ active: ['knowledge', 'knowledge-detail', 'knowledge-upload'].includes(screen) }" @click="showScreen('knowledge')">知识库</button>
        <button type="button" :class="{ active: ['experts', 'expert-detail', 'expert-create'].includes(screen) }" @click="showScreen('experts')">智能专家库</button>
      </nav>
      <template v-if="screen === 'home'">
        <section class="home-hero">
          <h1>供应链多智能体协同专家研讨系统</h1>
          <p>汇集供应网络、物流韧性、契约协调等公开研究方法的数字专家，围绕供应链议题开展结构化研讨，沉淀观点、证据与可执行建议。</p>
          <div><button type="button" class="btn btn-light" @click="focusQuestion">发起研讨</button><button type="button" class="btn btn-outline" @click="backToHall">进入研讨厅</button><button type="button" class="btn btn-outline" @click="showScreen('experts')">智能专家库</button></div>
        </section>
        <div class="home-metrics">
          <div class="card"><strong>{{ history.length }}</strong><span>研讨总数 · 进行中/待推进 {{ runningCount }}</span></div>
          <div class="card"><strong>{{ completedCount }}</strong><span>已完成研讨</span></div>
          <div class="card"><strong>{{ experts.length }}</strong><span>数字专家 · 活跃 {{ activeExpertCount }}</span></div>
          <div class="card"><strong>{{ knowledge.length }}</strong><span>知识库文档</span></div>
        </div>
        <div class="home-columns">
          <section class="card home-panel"><h2>最新研讨</h2><table><thead><tr><th>标题</th><th>状态</th><th>时间</th></tr></thead><tbody><tr v-for="item in history.slice(0, 6)" :key="item.seminar_id"><td><button class="table-link" @click="open(item.seminar_id)">{{ seminarTitle(item) }}</button></td><td><span class="badge" :class="`is-${item.status}`">{{ statusText(item.status, item.phase) }}</span></td><td>{{ formatDate(item.created_at).slice(5) }}</td></tr><tr v-if="!history.length"><td colspan="3">暂无研讨记录，点击“发起研讨”开始。</td></tr></tbody></table></section>
          <section class="card home-panel"><h2>最新专家</h2><table><thead><tr><th>名称</th><th>角色</th><th>状态</th></tr></thead><tbody><tr v-for="item in experts.slice(0, 8)" :key="item.id"><td><button class="table-link" @click="openExpert(item)">{{ item.name }}</button></td><td>{{ item.role }}</td><td>{{ item.status === 'active' ? '活跃' : '停用' }}</td></tr></tbody></table></section>
          <section class="card home-panel"><h2>研讨状态分布</h2><div v-for="item in statusDistribution" :key="item.label" class="distribution-row"><span>{{ item.label }}</span><div class="bar-track"><i :style="{ width: `${item.percent}%` }"></i></div><b>{{ item.count }}</b></div></section>
          <section class="card home-panel"><h2>研讨模式分布</h2><div v-for="item in modeDistribution" :key="item.label" class="distribution-row"><span>{{ item.label }}</span><div class="bar-track"><i :style="{ width: `${item.percent}%` }"></i></div><b>{{ item.count }}</b></div></section>
        </div>
        <section class="card home-panel trend-panel"><h2>研讨创建趋势（最近 14 天）</h2><div class="trend-bars"><div v-for="item in creationTrend" :key="item.date"><span :style="{ height: `${Math.max(3, item.count * 28)}px` }"></span><small>{{ item.date.slice(5) }}</small></div></div></section>
      </template>
      <header v-else class="page-heading">
        <div class="breadcrumb">SCnet / 专家研讨厅</div>
        <div class="heading-row">
          <div>
            <h1>{{ pageTitle }}</h1>
            <p>{{ ['knowledge', 'knowledge-detail', 'knowledge-upload'].includes(screen) ? '供应链参考资料与可追溯证据' : ['experts', 'expert-detail', 'expert-create'].includes(screen) ? '数字专家角色、领域与发言风格' : '供应风险、运输与地缘、采购与市场专家协同研讨，由主持人综合结论。' }}</p>
          </div>
          <button v-if="['hall', 'detail'].includes(screen)" class="btn btn-primary" type="button" @click="focusQuestion">+ 发起研讨</button>
          <button v-if="screen === 'knowledge'" class="btn btn-primary" type="button" @click="showScreen('knowledge-upload')">+ 上传文档</button>
          <button v-if="screen === 'experts'" class="btn btn-primary" type="button" @click="showScreen('expert-create')">+ 创建专家</button>
        </div>
      </header>

      <nav v-if="['hall', 'create', 'detail', 'report'].includes(screen)" class="seminar-nav" aria-label="研讨厅导航">
        <button type="button" :class="{ active: screen === 'hall' }" @click="backToHall">研讨大厅</button>
        <button type="button" :class="{ active: screen === 'create' }" @click="focusQuestion">发起研讨</button>
        <button v-if="['detail', 'report'].includes(screen)" type="button" :class="{ active: screen === 'detail' }" @click="screen = 'detail'">研讨现场</button>
        <button v-if="screen === 'report'" type="button" class="active">完整报告</button>
      </nav>

      <template v-if="screen === 'knowledge'">
        <section class="card filter-card"><div class="field search-field"><label>检索</label><input v-model.trim="knowledgeSearch" placeholder="搜索标题、关键词或机构"></div><div class="field"><label>来源</label><select v-model="knowledgeScope"><option value="">全部</option><option value="public">公开资料</option><option value="public_evidence">已核验案例证据</option><option value="uploaded">上传资料</option><option value="expert_library">专家方法知识</option></select></div><div class="field"><label>专家归属</label><select v-model="knowledgeExpert"><option value="">全部专家</option><option v-for="expert in experts.filter(row => row.built_in)" :key="expert.id" :value="expert.id">{{ expert.name }}</option></select></div><button type="button" class="btn btn-secondary" @click="knowledgeSearch=''; knowledgeScope=''; knowledgeExpert=''">重置</button></section>
        <section class="card home-panel"><h2>知识库 <span class="count-accent">{{ filteredKnowledge.length }}</span></h2><table><thead><tr><th>标题</th><th>归属</th><th>来源</th><th>关键词</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredKnowledge" :key="item.id"><td><button class="table-link" @click="openKnowledge(item.id)">{{ item.title }}</button></td><td>{{ item.origin === 'public_evidence' ? '公开案例 · 自动供相关专家检索' : item.origin === 'expert_library' ? item.expert_names?.join(' / ') : item.scope === 'uploaded' ? '上传' : '现有' }}</td><td>{{ item.publisher || item.source_type || '资料' }}</td><td>{{ (item.keywords || []).slice(0, 3).join(' · ') || '—' }}</td><td><button class="table-link" @click="openKnowledge(item.id)">查看</button></td></tr><tr v-if="!filteredKnowledge.length"><td colspan="5">没有符合条件的资料</td></tr></tbody></table></section>
      </template>

      <template v-if="screen === 'knowledge-detail' && activeKnowledge"><button class="back-link" @click="showScreen('knowledge')">← 返回知识库</button><section class="card detail-document"><h2>{{ activeKnowledge.title }}</h2><p>{{ activeKnowledge.publisher || activeKnowledge.source_type }} · {{ activeKnowledge.scope === 'uploaded' ? '上传资料' : '现有知识库' }}</p><div class="topic-keywords"><span v-for="tag in activeKnowledge.keywords || []" :key="tag" class="badge is-blue">{{ tag }}</span></div><SeminarKnowledgeCard v-if="activeKnowledge.origin === 'expert_library'" :document="activeKnowledge" /><SeminarPublicEvidenceCard v-else-if="activeKnowledge.origin === 'public_evidence'" :document="activeKnowledge" /><h3 v-else>文档内容与证据</h3><pre v-if="activeKnowledge.content && !['expert_library', 'public_evidence'].includes(activeKnowledge.origin)">{{ activeKnowledge.content }}</pre><div v-else-if="activeKnowledge.evidence?.length"><p v-for="row in activeKnowledge.evidence" :key="row.evidence_id">{{ row.title || row.summary || row.evidence_id }}</p></div><p v-else-if="!['expert_library', 'public_evidence'].includes(activeKnowledge.origin)">该登记文档尚无可展示的正文，请通过原始来源查看。</p><a v-if="activeKnowledge.url" :href="activeKnowledge.url" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a></section></template>

      <template v-if="screen === 'knowledge-upload'"><section class="card create-card"><div class="card-heading"><h2>上传知识文档</h2><span>选择文件或直接粘贴资料内容</span></div><div class="field"><label>文件（可选）</label><input type="file" accept=".txt,.md,.csv,.docx,.pdf,.pptx,.xlsx" @change="onKnowledgeFile"></div><div class="field"><label>标题 *</label><input v-model.trim="knowledgeForm.title" maxlength="160" placeholder="资料标题"></div><div class="field"><label>关键词</label><input v-model.trim="knowledgeForm.keywords" placeholder="逗号分隔"></div><div class="field"><label>来源类型</label><select v-model="knowledgeForm.source_type"><option>科技报告</option><option>学术文献</option><option>政策法规</option><option>市场资料</option><option>其他资料</option></select></div><div class="field"><label>内容（选择文件后可留空）</label><textarea v-model="knowledgeForm.content" rows="9" placeholder="可直接粘贴资料正文"></textarea></div><el-alert v-if="error" :title="error" type="error" :closable="false"/><div class="form-actions"><button class="btn btn-secondary" @click="showScreen(uploadFromCreate ? 'create' : 'knowledge')">取消</button><button class="btn btn-primary" :disabled="!knowledgeForm.title || (!knowledgeForm.content && !knowledgeFile) || submitting" @click="saveKnowledge">{{ submitting ? '入库中…' : '入库并标引' }}</button></div></section></template>

      <template v-if="screen === 'experts'"><section class="card filter-card"><div class="field search-field"><label>关键词</label><input v-model.trim="expertSearch" placeholder="搜索专家名称、角色或领域"></div><div class="field"><label>状态</label><select v-model="expertStatus"><option value="">全部</option><option value="active">活跃</option></select></div><button class="btn btn-secondary" @click="expertSearch='';expertStatus=''">重置</button></section><section class="card home-panel"><h2>智能专家库 <span class="count-accent">{{ filteredExperts.length }}</span></h2><table><thead><tr><th>专家</th><th>角色</th><th>研究流派 / 领域</th><th>风格</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredExperts" :key="item.id"><td><button class="table-link" @click="openExpert(item)">{{ item.name }}</button></td><td>{{ item.role }}</td><td>{{ item.school || (item.tags || []).join(' · ') }}</td><td>{{ item.style }}</td><td>{{ item.status === 'active' ? '活跃' : '停用' }}</td><td><button class="table-link" @click="openExpert(item)">查看</button></td></tr></tbody></table></section></template>

      <template v-if="screen === 'expert-detail' && activeExpert">
        <button class="back-link" @click="showScreen('experts')">← 返回专家库</button>
        <div class="expert-profile-heading"><div><h2>{{ activeExpert.name }}</h2><p>{{ activeExpert.role }} · {{ (activeExpert.tags || []).join(" / ") }}</p></div><button class="btn btn-primary" @click="useExpert(activeExpert)">与该专家发起研讨</button></div>
        <ExpertPublicMethod :expert="activeExpert" @open-knowledge="openKnowledge" />
        <div class="expert-profile-grid">
          <details :key="activeExpert.id" class="card expert-profile-card profile-fold"><summary>专家画像 · 角色、模型与检索配置</summary>
            <dl class="profile-list">
              <div><dt>角色定位</dt><dd>{{ activeExpert.role }}</dd></div>
              <div><dt>分析视角</dt><dd>{{ (activeExpert.tags || []).join(" / ") || activeExpert.role }}</dd></div>
              <div><dt>领域标签</dt><dd><span v-for="tag in activeExpert.tags || []" :key="tag" class="badge is-blue profile-tag">{{ tag }}</span><span v-if="!activeExpert.tags?.length">未设置</span></dd></div>
              <div><dt>当前模型</dt><dd>{{ activeExpert.base_model || '系统默认模型' }} <button class="table-link" @click="openExpertModelConfig">更换模型</button><small class="profile-note">{{ activeExpert.model_provider }} · {{ activeExpert.model_configured ? '服务已配置' : '尚未配置服务凭据' }}</small></dd></div>
              <div><dt>发言风格</dt><dd><span class="badge">{{ activeExpert.style || '未设置' }}</span></dd></div>
              <div><dt>发言限制</dt><dd>目标每轮 250 至 350 字；第五轮检查收敛，未收敛则定向补证复议，标准最多九轮</dd></div>
              <div><dt>参考资料</dt><dd>每场研讨可选参考资料，并可分配给指定专家</dd></div>
              <div v-if="activeExpert.rag?.enabled"><dt>RAG 参数</dt><dd>Top-K={{ activeExpert.rag.top_k }} · 阈值={{ activeExpert.rag.threshold }}</dd></div>
              <div v-if="activeExpert.few_shot_examples?.length"><dt>Few-Shot 示例</dt><dd>{{ activeExpert.few_shot_examples.length }} 条发言示例</dd></div>
              <div><dt>实现机制</dt><dd>{{ activeExpert.rag?.enabled && activeExpert.few_shot_examples?.length ? '公开方法指令 + 检索增强 + 表达示例' : activeExpert.rag?.enabled ? 'Prompt + RAG' : 'Prompt' }}</dd></div>
              <div v-if="activeExpert.agent_capabilities?.independent_research"><dt>自主研究</dt><dd>独立 Agent · 假设 → 工具调用 → 结果评估 → 继续 / 结束<small class="profile-note">本场独立工作记忆；每位专家最多 {{ activeExpert.agent_capabilities.max_model_runs }} 次模型实验。</small></dd></div>
              <div v-if="activeExpert.agent_capabilities?.tools?.length"><dt>专业模型范围</dt><dd>{{ activeExpert.agent_capabilities.tools.map(row => row.label).join('、') }}</dd></div>
              <div><dt>创建人</dt><dd>{{ activeExpert.built_in ? '系统预设' : '用户创建' }}</dd></div>
              <div><dt>状态</dt><dd><span class="badge" :class="activeExpert.status === 'active' ? 'is-completed' : 'is-failed'">{{ activeExpert.status === 'active' ? '活跃' : '停用' }}</span></dd></div>
            </dl>
            <details ref="expertModelPanel" class="profile-prompt-details"><summary>配置该专家的模型</summary><div class="field"><label>模型服务</label><select v-model="expertModelForm.provider_id" @change="changeExpertProvider"><option value="">使用系统默认配置</option><option v-for="provider in expertModelProviders" :key="provider.provider_id" :value="provider.provider_id">{{ provider.label }}{{ provider.configured ? '' : '（凭据未配置）' }}</option></select></div><div v-if="expertModelForm.provider_id" class="field"><label>模型型号</label><select :value="selectedExpertModelOption" @change="chooseExpertModel($event.target.value)"><option v-for="model in currentExpertModels" :key="model.id" :value="model.id">{{ model.label }} · {{ model.id }}</option><option value="__custom__">自定义模型 ID</option></select></div><div v-if="expertModelForm.provider_id && selectedExpertModelOption === '__custom__'" class="field"><label>模型 ID</label><input v-model.trim="expertModelForm.model_id" maxlength="160" placeholder="填写该服务支持的模型 ID"></div><p class="profile-muted">同一服务下也可分别选择不同型号，例如 DeepSeek Flash、Pro；未列出的型号可选“自定义模型 ID”。研究与各轮发言使用相同配置；保存后对新发起的研讨生效。服务凭据由后端配置。</p><p v-if="expertModelError" class="profile-error">{{ expertModelError }}</p><p v-if="expertModelSaved" class="profile-muted">已保存该专家的模型配置。</p><button class="btn btn-primary btn-small" :disabled="savingExpertModel" @click="saveExpertModel">{{ savingExpertModel ? '保存中…' : '保存模型配置' }}</button></details><details class="profile-prompt-details"><summary>配置检索参数与示例</summary><p class="profile-muted">检索阈值按本场候选片段的相对相关度计算；0.5 表示保留达到本场最高分一半的片段，不是事实可信度。</p><div class="profile-rag-fields"><div class="field"><label>Top-K（1–10）</label><input v-model.number="retrievalForm.top_k" type="number" min="1" max="10"></div><div class="field"><label>阈值（0–1）</label><input v-model.number="retrievalForm.threshold" type="number" min="0" max="1" step="0.05"></div></div><div class="field"><label>Few-Shot 示例（每行一条，最多 3 条）</label><textarea v-model="retrievalForm.examples" rows="5" placeholder="结论：… 依据：… 待核验：…"></textarea></div><p v-if="retrievalError" class="profile-error">{{ retrievalError }}</p><button class="btn btn-primary btn-small" :disabled="savingRetrieval" @click="saveExpertRetrieval">{{ savingRetrieval ? '保存中…' : '保存专家配置' }}</button></details>
          </details>
          <section v-if="false" class="card expert-profile-card"><h3>提示词版本（{{ activeExpert.prompt_versions?.length || 1 }}）</h3><p class="profile-muted">版本记录来自当前专家配置；评测分为该版本实际发言的模型辅助参考分。</p><div class="profile-version-table"><div class="profile-version-row profile-version-head"><span>版本</span><span>评测分</span><span>状态</span><span>说明</span><span>时间</span></div><div v-for="version in activeExpert.prompt_versions || [{ version: 'v1.0', status: 'published', description: '当前角色指令', created_at: activeExpert.created_at }]" :key="version.version" class="profile-version-row"><strong>{{ version.version }}</strong><span>{{ expertEvaluations.find(row => row.prompt_version === version.version)?.overall ?? '未评测' }}</span><span class="badge" :class="version.status === 'published' ? 'is-completed' : ''">{{ version.status === 'published' ? '使用中' : '历史版本' }}</span><span>{{ version.description }}</span><span>{{ formatDate(version.created_at) }}</span></div></div><p class="profile-muted">角色指令在后台用于约束专家职责、研究方法和证据边界，暂不展示正文。</p></section>
          <section class="card expert-profile-card"><div class="profile-section-head"><h3>能力评测</h3><button class="btn btn-secondary btn-small" :disabled="evaluatingExpert || !activeExpertSeminars.length" @click="runExpertEvaluation">{{ evaluatingExpert ? '评测中…' : '运行模型辅助评测' }}</button></div><p class="profile-muted">依据实际发言生成六维模型辅助参考分。</p><details class="profile-method"><summary>评测方法说明</summary><p>样本取自当前提示词版本的研讨发言，最多 6 条完整发言、合计不超过 1.8 万字。</p><p>由研讨服务配置的大模型按议题相关性、专业分析、证据意识、风险边界、建议可执行性和表达清晰度各给 0–100 分；综合分是六项的算术平均值。</p><p>这是文本质量的模型辅助评估，没有进行独立事实核验或真人盲评，不能代表专家资质、事实正确率或决策可靠性。</p></details><p v-if="expertEvaluationError" class="profile-error">{{ expertEvaluationError }}</p><template v-if="latestExpertEvaluation"><div class="profile-activity"><strong>{{ latestExpertEvaluation.overall }}</strong><span>综合参考分 · {{ latestExpertEvaluation.sample_count }} 条发言 · {{ formatDate(latestExpertEvaluation.created_at) }}</span></div><div v-for="(score, dimension) in latestExpertEvaluation.scores" :key="dimension" class="profile-score"><span>{{ dimension }}</span><div class="bar-track"><i :style="{ width: `${score}%` }"></i></div><b>{{ score }}</b></div><p class="profile-muted">{{ latestExpertEvaluation.comment }}</p></template><p v-else class="profile-muted">暂无评测记录。参与研讨后可运行评测。</p><h4>最近评测（{{ expertEvaluations.length }}）</h4><div v-for="record in expertEvaluations.slice(0, 5)" :key="record.id" class="profile-evaluation-record"><span>{{ formatDate(record.created_at) }}</span><strong>{{ record.overall }} 分</strong><small>{{ record.method }}</small></div><h4>最近参与（{{ activeExpertSeminars.length }}）</h4><div v-if="activeExpertSeminars.length" class="profile-recent"><div v-for="item in activeExpertSeminars.slice(0, 5)" :key="item.seminar_id"><button class="table-link" @click="open(item.seminar_id)">{{ seminarTitle(item) }}</button><small>{{ formatDate(item.updated_at || item.created_at) }}</small></div></div><p v-else class="profile-muted">该专家尚未参与研讨。</p></section>
        </div>
        <details :key="activeExpert.id" class="card research-resources automatic-resources">
          <summary>自动研究资源 · 已绑定知识与系统数据</summary>
          <p class="profile-muted">系统自动绑定专家方法知识、匹配议题资料并读取已有数据，发起研讨即可使用，无需勾选资料或填写实验数值。每场启动时保留资料与数据快照。</p>
          <h4>专家专属知识（{{ automaticMethodDocuments.length }}）</h4>
          <div class="automatic-docs"><button v-for="document in automaticMethodDocuments" :key="document.id" type="button" class="table-link" @click="openKnowledge(document.id)">{{ document.title }} <small>{{ document.access_label }}</small></button></div>
          <h4>公开案例与场景资料 · 自动匹配（{{ automaticScenarioDocuments.length }}）</h4><p class="profile-muted">仅绑定有原文支持的事实。未公开字段不建知识条目；案例资料供分析使用，作者归属与专家本人的方法文献分开标注。</p>
          <p v-if="automaticResourcesLoading" class="profile-muted">正在读取已接入的场景资源…</p>
          <p v-else-if="automaticResourceError" class="profile-muted">{{ automaticResourceError }}；专属知识已绑定，启动时会再次自动匹配场景资料。</p>
          <div v-else class="automatic-docs"><button v-for="document in automaticScenarioDocuments" :key="document.id" type="button" class="table-link" @click="openKnowledge(document.id)">{{ document.title }}</button><p v-if="!automaticScenarioDocuments.length" class="profile-muted">按发起时的议题自动检索知识库。</p></div>
          <h4>系统数据与公开证据</h4>
          <p v-if="automaticResourceSummary?.year" class="profile-muted">已接入 {{ automaticResourceSummary.year }} 年历史产量，覆盖 {{ automaticResourceSummary.country_count }} 个国家；来源为系统已登记的公开历史产量库。</p>
          <p v-if="automaticResourceSummary?.network_nodes" class="profile-muted">本体关联 {{ automaticResourceSummary.network_nodes }} 个节点，按议题匹配使用。</p>
          <p class="profile-muted">研讨启动时自动核对一手年报、库存与产销、合同披露和交付记录；时间、单位和来源随证据保留。实验由专家按议题选择，输入来自已接入数据。</p>
          <p class="profile-muted">具体企业尚未接入的库存、订单与订舱数据会单列为执行前提，公开资料研判照常进行。</p>
          <p class="profile-muted">可用专业工具：{{ activeExpert.agent_capabilities?.tools?.map(row => row.label).join('、') || '按议题自动匹配' }}</p>
        </details>
      </template>

      <template v-if="screen === 'expert-create'"><section class="card create-card"><div class="card-heading"><h2>创建数字专家</h2><span>配置供应链角色与分析边界</span></div><div class="field"><label>专家名称 *</label><input v-model.trim="expertForm.name" maxlength="48" placeholder="例如：供应韧性专家"></div><div class="field"><label>角色定位 *</label><input v-model.trim="expertForm.role" maxlength="80" placeholder="例如：跨国采购与供应韧性分析"></div><div class="field"><label>领域标签</label><input v-model.trim="expertForm.tags" placeholder="逗号分隔"></div><div class="field"><label>发言风格</label><select v-model="expertForm.style"><option>严谨型</option><option>审慎型</option><option>务实型</option><option>前瞻型</option><option>保守型</option><option>激进型</option></select></div><div class="field"><label>系统提示词与分析边界 *</label><textarea v-model.trim="expertForm.instruction" rows="7" maxlength="2000" placeholder="说明专家分析什么、依据什么资料、哪些问题需要标明证据不足"></textarea></div><el-alert v-if="error" :title="error" type="error" :closable="false"/><div class="form-actions"><button class="btn btn-secondary" @click="showScreen('experts')">取消</button><button class="btn btn-primary" :disabled="!expertForm.name || !expertForm.role || !expertForm.instruction || submitting" @click="saveExpert">{{ submitting ? '创建中…' : '提交创建' }}</button></div></section></template>

      <template v-if="screen === 'hall'">
        <section ref="historySection" class="card filter-card" aria-label="筛选历史研讨">
          <div class="field search-field">
            <label for="seminar-search">关键词</label>
            <input id="seminar-search" v-model.trim="searchKeyword" type="search" placeholder="搜索研讨问题…">
          </div>
          <div class="field">
            <label for="seminar-status">状态</label>
            <select id="seminar-status" v-model="statusFilter">
              <option value="">全部</option>
              <option value="running">进行中</option>
              <option value="paused">待执行实验 / 待主持人推进</option>
              <option value="completed">已完成</option>
              <option value="failed">未完成</option>
            </select>
          </div>
          <div class="field">
            <label for="seminar-mode-filter">研讨模式</label>
            <select id="seminar-mode-filter" v-model="modeFilter">
              <option value="">全部</option>
              <option v-for="item in modeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="field">
            <label for="seminar-filter-scenario">研讨场景</label>
            <select id="seminar-filter-scenario" v-model="scenarioFilter">
              <option value="">全部</option>
              <option value="uranium">铀供应链</option>
              <option value="auto">汽车供应链</option>
            </select>
          </div>
          <button class="btn btn-secondary filter-reset" type="button" @click="resetFilters">重置</button>
        </section>

        <div class="list-heading">
          <h2>研讨记录 <span>{{ filteredHistory.length }}</span></h2>
          <span>已完成 {{ completedCount }} · 进行中/待推进 {{ runningCount }}</span>
        </div>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="alert" />
        <div v-if="!filteredHistory.length" class="card empty-state">
          <div class="empty-icon">◎</div>
          <strong>{{ history.length ? '没有符合条件的研讨' : '还没有研讨记录' }}</strong>
          <p>{{ history.length ? '试试调整关键词或筛选条件。' : '从一个明确的供应链问题开始，让专家给出各自判断。' }}</p>
          <button v-if="!history.length" class="btn btn-primary" type="button" @click="focusQuestion">+ 发起研讨</button>
        </div>
        <div v-else class="seminar-list">
          <article v-for="item in filteredHistory" :key="item.seminar_id" class="card seminar-item">
            <div class="seminar-item-main">
              <button class="seminar-item-title" type="button" @click="open(item.seminar_id)">{{ seminarTitle(item) }}</button>
              <p v-if="seminarTitle(item) !== item.question">{{ item.question }}</p>
              <div class="meta-line">
                <span class="badge" :class="`is-${item.status}`">{{ statusText(item.status, item.phase) }}</span>
                <span class="badge is-neutral">{{ scenarioText(item.scenario) }}</span>
                <span class="badge is-neutral">{{ modeText(item.mode) }}</span>
                <span v-if="item.keywords?.length" class="meta-keywords">{{ item.keywords.slice(0, 3).join(' · ') }}</span>
                <span class="meta-time">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-secondary btn-small" type="button" @click="open(item.seminar_id)">进入研讨</button>
              <button v-if="item.status === 'failed'" class="btn btn-primary btn-small" type="button" :disabled="retryingId === item.seminar_id" @click="retry(item.seminar_id)">{{ retryingId === item.seminar_id ? '重试中…' : '重新研讨' }}</button>
            </div>
          </article>
        </div>
      </template>

      <template v-else-if="screen === 'create'">
        <div class="step-hint">① 填写研讨议题 → ② 选择供应链场景 → ③ 专家发言与主持人综合</div>
        <section ref="questionSection" class="card create-card" aria-labelledby="question-title">
          <div class="card-heading">
            <h2 id="question-title">研讨议题</h2>
            <span>请写清时间、对象和希望判断的问题</span>
          </div>
          <div class="field">
            <label for="seminar-question">讨论问题 <em>*</em></label>
            <el-input ref="questionInput" id="seminar-question" v-model="question" type="textarea" :rows="5"
                      maxlength="2000" show-word-limit
                      placeholder="例如：如果哈萨克斯坦铀供应中断，未来一年我国应如何调整采购来源、运输路线与库存？"
                      @keydown.ctrl.enter="submit" />
            <div class="field-hint">按 Ctrl + Enter 也可以提交。专家只依据可获得的资料作答，证据不足时会明确说明。</div>
            <button class="btn btn-secondary btn-small" type="button" :disabled="!question.trim() || suggesting" @click="getSuggestion">{{ suggesting ? '正在生成建议…' : '⚡ 智能建议' }}</button>
            <div v-if="suggestion" class="suggestion-result"><strong>研讨设置建议</strong><p>{{ suggestion.reason || '建议已生成，可选择应用。' }}</p><p>标题：{{ suggestion.title }} · {{ modeText(suggestion.mode) }} · {{ scheduleText(suggestion.schedule_mode) }}</p><p>专家：{{ suggestion.experts.join('、') }}</p><button class="btn btn-primary btn-small" type="button" @click="applySuggestion">应用建议</button></div>
          </div>
          <div class="topic-suggestions" aria-label="常见研讨议题">
            <strong>议题参考</strong>
            <button v-for="item in suggestedQuestions" :key="item.label" type="button" @click="useSuggestion(item.question)">{{ item.label }}</button>
          </div>
          <div class="field">
            <label for="seminar-title">研讨标题（可选）</label>
            <input id="seminar-title" v-model.trim="title" type="text" maxlength="128" placeholder="留空时从讨论问题自动提取">
          </div>
          <div class="field">
            <label for="seminar-keywords">聚焦关键词（可选，逗号分隔）</label>
            <input id="seminar-keywords" v-model.trim="keywords" type="text" maxlength="256" placeholder="例如：供应稳定性，运输路线，采购时机">
            <div class="field-hint">关键词会随议题传给专家，帮助发言聚焦。</div>
          </div>
          <div class="setting-grid">
            <div class="field">
              <label for="seminar-scenario">研讨场景</label>
              <el-select id="seminar-scenario" v-model="scenario" aria-label="研讨场景">
                <el-option label="铀供应链" value="uranium" />
                <el-option label="汽车供应链" value="auto" />
              </el-select>
            </div>
            <div class="field">
              <label for="seminar-mode">研讨模式</label>
              <select id="seminar-mode" v-model="mode">
                <option v-for="item in modeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="field">
              <label for="seminar-schedule">调度方式</label>
              <select id="seminar-schedule" v-model="scheduleMode">
                <option value="serial">串行调度 · 依次回应</option>
                <option value="parallel">并行调度 · 同时分析</option>
                <option value="mixed">混合调度 · 先独立后讨论</option>
                <option value="moderator">主持人调度 · 逐位推进</option>
              </select>
            </div>
          </div>
          <div class="field-hint">串行依次回应；并行独立分析；混合先独立分析再交叉讨论；主持人调度需在研讨现场逐位推进。</div>
          <div class="field-hint">初始 {{ modeRoundCounts[mode] }} 轮后检查收敛；未收敛则补证并定向复议，标准最多 {{ mode === 'six_hats' ? 10 : 9 }} 轮。每轮所选专家分别发言，共同条件与停止原因会在现场展示。</div>
        </section>
        <section class="card sources-card" aria-label="研讨参考资料">
          <div class="card-heading"><h2>研讨参考资料</h2><span>系统按场景读取可获得的数据</span></div>
          <p v-if="scenario === 'uranium'">铀供应链研讨会读取最新供应链态势快照及其中的公开情报事件；议题与所取资料将发送给系统配置的大模型，研讨现场会列出使用的资料。</p>
          <p v-else>汽车供应链暂未接入自动资料快照。议题会发送给系统配置的大模型；专家应对缺少证据的判断明确说明。</p>
          <label class="web-search-choice"><input v-model="webSearch" type="checkbox"> 联网检索公开资讯后研讨</label>
          <p class="field-hint">勾选后，开始研讨时从公开新闻源检索供应链资讯，并在研讨记录中显示来源与检索状态。未取得资讯时会明确提示。</p>
          <button class="btn btn-secondary btn-small" type="button" @click="uploadFromCreate = true; screen = 'knowledge-upload'">上传本次研讨资料</button>
          <div class="reference-choices"><strong>从知识库选择参考文档（可选）</strong><p>选中的文档正文或证据会随议题发送给系统配置的大模型；可指定进入哪位专家的发言提示词。</p><div v-for="item in knowledge" :key="item.id" class="reference-row"><label><input v-model="selectedKnowledge" type="checkbox" :value="item.id"><span>{{ item.title }}</span><small>{{ item.scope === 'uploaded' ? '上传' : '现有' }}</small></label><select v-if="selectedKnowledge.includes(item.id)" v-model="knowledgeAssignments[item.id]" :aria-label="`${item.title} 参考范围`"><option value="all">所有专家</option><option v-for="expert in selectedExperts" :key="expert" :value="expert">供 {{ expert }}</option></select></div><p v-if="!knowledge.length">知识库暂无文档，可先上传。</p></div>
        </section>
        <section class="card expert-card" aria-label="参与研讨的专家">
          <div class="card-heading"><h2>AI 专家阵容</h2><span>选择至少一位专家；主持人负责综合</span></div>
          <div class="expert-select-actions"><button class="btn btn-secondary btn-small" type="button" :disabled="!question.trim() || suggesting" @click="recommendExperts">{{ suggesting ? '推荐中…' : '智能推荐专家' }}</button><button class="btn btn-secondary btn-small" type="button" @click="selectedExperts = expertRoles.map(item => item.name)">全选</button><button class="btn btn-secondary btn-small" type="button" @click="selectedExperts = []">清空</button></div>
          <div class="expert-grid">
            <label v-for="(item, index) in expertRoles" :key="item.name" :class="{ selected: selectedExperts.includes(item.name) }">
              <input v-model="selectedExperts" type="checkbox" :value="item.name">
              <span class="expert-mark">0{{ index + 1 }}</span><strong>{{ item.name }}</strong><small>{{ item.description }}</small>
            </label>
            <div><span class="expert-mark host">◆</span><strong>主持人</strong><small>综合观点与待核验问题</small></div>
          </div>
        </section>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="alert" />
        <SeminarMechanism :mode="mode" />
        <SeminarResearchSetup v-model="researchDraft" :names="selectedExperts" :profiles="experts" :scenario="scenario" :question="question" />
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" @click="backToHall">返回大厅</button>
          <button class="btn btn-primary" type="button" :disabled="!question.trim() || !selectedExperts.length || submitting" @click="submit">
            {{ submitting ? '正在发起…' : researchDraft.mode === 'experiment' ? researchDraft.auto_run ? '开始研究研讨' : '生成实验计划' : '开始研讨' }}
          </button>
        </div>
      </template>

      <template v-else-if="screen === 'detail'">
        <div class="detail-actions"><button class="back-link" type="button" @click="backToHall">← 返回研讨大厅</button><button v-if="active?.status !== 'running' && active?.opinions?.length" class="btn btn-primary btn-small" type="button" :disabled="continuingWithEvidence" @click="continueWithEvidence">{{ continuingWithEvidence ? '正在启动补证…' : '补充公开证据并继续复议' }}</button><button v-if="active?.status === 'paused' && active?.phase === 'awaiting_moderator'" class="btn btn-primary btn-small" type="button" :disabled="advancing" @click="advance">{{ advancing ? '正在推进…' : '请下一位专家发言' }}</button><button v-if="active?.status === 'failed'" class="btn btn-primary btn-small" type="button" :disabled="retryingId === active.seminar_id" @click="retry(active.seminar_id)">{{ retryingId === active.seminar_id ? '重试中…' : '重新研讨' }}</button></div>
        <div v-if="loadingDetail && !active" class="card loading-state">正在读取研讨记录…</div>
        <el-alert v-else-if="!active && error" :title="error" type="error" show-icon :closable="false" class="alert" />
        <template v-else-if="active">
          <section class="card topic-card">
            <div class="topic-head"><span class="badge" :class="`is-${active.status}`">{{ statusText(active.status, active.phase) }}</span><span class="badge is-neutral">{{ scenarioText(active.scenario) }}</span><span class="badge is-neutral">{{ modeText(active.mode) }}</span><span class="badge is-neutral">{{ scheduleText(active.schedule_mode) }}</span><span class="badge is-neutral">{{ webStatusText(active) }}{{ active.web_search_provider ? ` · ${active.web_search_provider}` : '' }}</span><span class="meta-time">创建：{{ formatDate(active.created_at) }}<template v-if="active.updated_at && active.updated_at !== active.created_at"> · 最后更新：{{ formatDate(active.updated_at) }}</template></span></div>
            <p v-if="active.web_search_status === 'failed'" class="field-hint">联网检索失败：{{ active.web_search_error }}。本次仅使用其他可得资料。</p>
            <h2>{{ active.title || active.question }}</h2>
            <p v-if="active.title && active.title !== active.question" class="topic-question">{{ active.question }}</p>
            <div v-if="active.keywords?.length" class="topic-keywords"><span v-for="keyword in active.keywords" :key="keyword" class="badge is-blue">{{ keyword }}</span></div>
            <p class="topic-flow">{{ (active.experts?.length ? active.experts : fallbackRoles.slice(0, 3).map(item => item.name)).join(active.schedule_mode === 'parallel' ? ' · ' : ' → ') }} → 主持人综合</p>
          </section>
          <section v-if="active.status === 'completed' && active.conclusion" class="card latest-finding"><h3>本场结论 · {{ active.deliberation?.converged ? active.deliberation.convergence_level === 'conditional_consensus' ? '条件共识' : '形成共识' : '主要发现与未决问题' }}</h3><template v-if="briefParagraphs.length"><p v-for="(paragraph, i) in briefParagraphs" :key="i">{{ paragraph }}</p></template><template v-else><p>{{ summaryView.overall }}</p><ul><li v-for="(action, i) in (summaryView.actions || []).slice(0, 2)" :key="i">{{ action }}</li></ul></template><button class="btn btn-primary btn-small" type="button" @click="screen = 'report'">查看结果报告与依据</button></section>
          <SeminarMechanism :seminar="active" />
          <SeminarDecisionProtocol :seminar="active" />
          <section class="card vote-card"><strong>议题立场投票</strong><span>每个浏览器可选择或修改一次立场</span><div><button type="button" class="btn btn-secondary btn-small" :class="{ selected: myVote === 'support' }" @click="vote('support')">👍 赞成（{{ voteCounts.support }}）</button><button type="button" class="btn btn-secondary btn-small" :class="{ selected: myVote === 'oppose' }" @click="vote('oppose')">👎 反对（{{ voteCounts.oppose }}）</button></div></section>
          <SeminarResearchPanel v-if="active.research" ref="researchPanel" :seminar="active" @updated="onResearchUpdated" @open-seminar="open" />
          <el-alert v-if="error || active.error" :title="error || active.error" type="error" show-icon :closable="false" class="alert" />
          <details :key="active.seminar_id" class="card dashboard-card" aria-label="研讨数据看板">
            <summary class="board-heading"><strong>研讨数据看板</strong><span>发言差异趋势 · 观点矩阵 · 共识分歧 · 决策仪表盘</span></summary>
            <div class="board-tabs" role="tablist" aria-label="看板类型">
              <button v-for="tabItem in [{ id: 'convergence', label: '发言差异趋势' }, { id: 'matrix', label: '观点矩阵' }, { id: 'consensus', label: '共识分歧' }, { id: 'decision', label: '决策仪表盘' }]" :key="tabItem.id" type="button" role="tab" :aria-selected="boardTab === tabItem.id" :class="{ active: boardTab === tabItem.id }" @click="boardTab = tabItem.id">{{ tabItem.label }}</button>
            </div>
            <div v-if="boardTab === 'convergence'" class="board-panel">
              <p class="board-explain">这条线展示每轮专家发言的<strong>文本差异度</strong>：0% 表示用词完全相同，越高表示用词差别越大。它不能判断专家是否真正达成共识。</p>
              <div v-if="chartPoints.length" class="curve-summary"><strong>最新一轮 {{ chartPoints.at(-1).difference_score }}%</strong><span v-if="chartDelta !== null">较首轮{{ chartDelta < 0 ? '下降' : '上升' }} {{ Math.abs(chartDelta) }} 个百分点</span><span v-else>目前只有一轮可比较</span></div>
              <div v-if="chartPoints.length" class="curve-wrap"><svg viewBox="0 0 1000 220" role="img" aria-label="各轮专家发言文本差异度曲线">
                <line x1="55" y1="40" x2="945" y2="40" class="chart-grid"/><line x1="55" y1="105" x2="945" y2="105" class="chart-grid"/><line x1="55" y1="170" x2="945" y2="170" class="chart-grid"/>
                <text x="9" y="27">差异度</text><text x="12" y="44">100</text><text x="18" y="109">50</text><text x="25" y="174">0</text>
                <polyline v-if="chartPoints.length > 1" :points="chartLine" class="chart-line"/>
                <g v-for="point in chartPoints" :key="point.round"><circle :cx="point.x" :cy="point.y" r="6" class="chart-dot"><title>第{{ point.round }}轮 · {{ point.label }}：文本差异度 {{ point.difference_score }}%，{{ point.speech_count }} 位专家发言</title></circle><text :x="point.x" :y="Math.max(28, point.y - 14)" text-anchor="middle" class="chart-value">{{ point.difference_score }}%</text><text :x="point.x" y="205" text-anchor="middle">第{{ point.round }}轮</text></g>
              </svg></div>
              <p v-else class="board-empty">至少两位专家完成同一轮发言后显示曲线。</p>
              <p class="board-method">按同一轮专家发言的文字片段计算，仅用于观察措辞变化；共识和分歧请查看对应看板。</p>
            </div>
            <div v-else-if="boardTab === 'matrix'" class="board-panel matrix-scroll">
              <p class="board-explain">各专家在议题关键词上的相对提及强度；同一列提及密度最高的专家记为 100。数值不代表支持该观点。</p>
              <table v-if="matrixRows.length && matrixDimensions.length" class="opinion-heatmap"><thead><tr><th scope="col">专家</th><th v-for="dimension in matrixDimensions" :key="dimension" scope="col" :title="dimension">{{ dimension }}</th></tr></thead><tbody><tr v-for="row in matrixRows" :key="row.expert"><th scope="row">{{ row.expert }}</th><td v-for="cell in row.cells" :key="cell.dimension"><div class="heat-cell" :style="{ backgroundColor: `rgba(38, 110, 145, ${0.12 + cell.score * 0.0068})` }" :title="`${row.expert}提及“${cell.dimension}”${cell.count}次；相对强度${cell.score}`">{{ cell.count ? cell.score : '—' }}</div></td></tr></tbody></table>
              <p v-else class="board-empty">专家发言和议题关键词齐备后显示观点矩阵。</p>
            </div>
            <div v-else-if="boardTab === 'consensus'" class="board-panel">
              <p class="board-explain">按摘要与专家原始发言的文字关联度排序；分数不代表赞成率或事实可信度。</p>
              <section class="point-group"><h3 class="consensus-title">共识点</h3><div v-for="(point, index) in consensusPoints" :key="index" class="point-row" :title="point.text"><span class="point-label">{{ point.text }}</span><div class="point-track"><i class="is-consensus" :style="{ width: `${point.score}%` }"></i></div><strong>{{ point.score }}</strong></div><p v-if="!consensusPoints.length" class="board-empty">尚未形成结构化共识。</p></section>
              <section class="point-group"><h3 class="difference-title">分歧点</h3><div v-for="(point, index) in differencePoints" :key="index" class="point-row" :title="point.text"><span class="point-label">{{ point.text }}</span><div class="point-track"><i class="is-difference" :style="{ width: `${point.score}%` }"></i></div><strong>{{ point.score }}</strong></div><p v-if="!differencePoints.length" class="board-empty">尚未形成结构化分歧。</p></section>
            </div>
            <div v-else class="board-panel">
              <div class="dashboard-grid"><div><strong>{{ active.opinions?.length || 0 }} / {{ active.planned_speeches || active.experts?.length || 3 }}</strong><span>专家发言</span></div><div><strong>{{ roundGroups.length }}</strong><span>已启动轮次</span></div><div><strong>{{ active.evidence?.length || 0 }}</strong><span>参考资料</span></div><div><strong>{{ voteCounts.support }} / {{ voteCounts.oppose }}</strong><span>议题赞成 / 反对</span></div></div>
              <h3>建议行动</h3><ul v-if="summaryView.actions?.length"><li v-for="(text, index) in summaryView.actions" :key="index">{{ text }}</li></ul><p v-else class="board-empty">主持人总结完成后显示建议行动。</p>
            </div>
          </details>
          <section ref="resultSection" class="card discussion-card" aria-label="研讨现场" aria-live="polite">
            <div class="card-heading"><h2>研讨现场 <span class="round-count">第 {{ roundGroups.at(-1)?.number || 0 }} 轮</span></h2><span v-if="active.status === 'running'" class="running-tag">{{ phaseText(active.phase) }}</span></div>
            <p class="discussion-sub">{{ active.status === 'completed' ? '研讨已完成；仍可评论已形成的观点，评论不会重新触发专家发言。' : 'AI 专家发言实时呈现；用户补充会进入尚未开始的后续发言提示词。' }}</p>
            <div v-if="active.opinions?.length" class="speech-stats">
              <span>专家发言次数</span><span v-for="item in speechCounts" :key="item.name" class="badge is-blue">{{ item.name }} × {{ item.count }}</span>
            </div>
            <div v-for="round in roundGroups" :key="round.number" class="seminar-round">
              <div class="round-title">第 {{ round.number }} 轮 <span>{{ round.label }} · {{ round.opinions.length }} 位专家已发言</span></div>
              <article v-for="opinion in round.opinions" :id="`seminar-speech-${opinion.index}`" :key="opinion.index" class="message-card">
                <div class="message-head"><span class="speaker-avatar">{{ opinion.index + 1 }}</span><strong>{{ opinion.expert }}</strong><span class="badge is-blue">AI 专家</span><small>{{ formatDate(opinion.created_at) }}</small></div>
                <div v-if="opinion.experiment_ids?.length" class="speech-research-links"><button v-for="id in opinion.experiment_ids" :key="id" type="button" class="table-link" @click="researchPanel?.openExperiment(id)">引用 {{ active.research?.experiments.find(row => row.id === id)?.display_code || '实验' }} · 查看依据</button><small>本体关联提供关系线索；实验卡区分输入数据与情景假设。</small></div>
                <div v-if="opinion.content.length <= 450 || expandedSpeeches.has(opinion.index)" class="markdown-body" v-html="renderMarkdown(opinion.content)"></div>
                <p v-else class="speech-preview">{{ plainExcerpt(opinion.content, 300) }}</p>
                <button v-if="opinion.content.length > 450" type="button" class="speech-toggle" @click="toggleSpeech(opinion.index)">{{ expandedSpeeches.has(opinion.index) ? '收起发言' : '展开完整发言' }}</button>
                <ExpertMethodApplication :application="opinion.method_application" :response="opinion.peer_response" :profile="active.expert_profile_snapshots?.[opinion.expert]" />
                <details v-if="opinion.retrieved_sources?.length" class="speech-evidence"><summary>本轮检索与引用（{{ opinion.retrieved_sources.length }}）</summary><template v-if="opinion.retrieval_trace"><p>检索关注：{{ opinion.retrieval_trace.expert_focus }}</p><p v-if="opinion.retrieval_trace.previous_unresolved">追查上一轮问题：{{ opinion.retrieval_trace.previous_unresolved }}</p><p>以下资料已送入该专家本轮上下文；共同事实可由多位专家引用。相关度是分类内的检索排序分，不是事实可信度。</p></template><p v-else>历史检索快照：当时未记录专属查询词；保留原记录，未按今天的知识库重算。</p><ul><li v-for="(source, sourceIndex) in opinion.retrieved_sources" :key="`${source.id || source.title}-${sourceIndex}`"><span>{{ source.kind === 'method' || source.retrieval_category === 'expert_method' ? '专家方法' : '案例资料' }} · </span><a v-if="source.source" :href="source.source" target="_blank" rel="noopener noreferrer">{{ source.title || source.id }}</a><span v-else>{{ source.title || source.id || '未命名资料' }}</span> <small v-if="Number.isFinite(source.relevance)">分类内相对相关度 {{ Math.round(source.relevance * 100) }}</small> <strong v-if="speechReferences(opinion).has(source.id)"> · 本轮登记引用</strong></li></ul></details>
                <div class="speech-actions"><button type="button" :class="{ selected: mySpeechVote(opinion.index) === 'support' }" @click="voteOpinion(opinion.index)">👍 赞同（{{ speechVoteCount(opinion.index) }}）</button><button type="button" @click="commentOn(opinion.index)">评论 / 反驳 / 补充</button><span>{{ (active.interactions || []).filter(item => item.target === `speech:${opinion.index}`).length }} 条互动</span></div>
                <div v-for="row in (active.interactions || []).filter(item => item.target === `speech:${opinion.index}` || item.target === opinion.expert && !opinion.round)" :key="row.id" class="interaction-row"><b>{{ interactionKindText(row.kind) }}</b> {{ row.content }} <small>{{ formatDate(row.created_at) }}</small></div>
              </article>
            </div>
            <article v-if="active.conclusion" class="message-card moderator-card">
              <div class="message-head"><span class="speaker-avatar moderator-avatar">◆</span><strong>主持人</strong><span class="badge is-green">综合结论</span></div>
              <div class="markdown-body" v-html="renderMarkdown(active.conclusion.slice(0, 700) + (active.conclusion.length > 700 ? '…' : ''))"></div><button v-if="active.conclusion.length > 700" type="button" class="table-link" @click="screen = 'report'">查看全文</button>
            </article>
            <div v-if="active.status === 'running' && !active.opinions?.length" class="waiting-state"><span class="spinner"></span>正在整理资料，专家观点即将呈现…</div>
            <div v-if="!active.opinions?.length && !active.conclusion && active.status !== 'running'" class="waiting-state">{{ active.phase === 'awaiting_experiments' ? '请在上方确认数据并执行实验，随后进入逐轮讨论。' : '暂无专家发言' }}</div>
            <section id="seminar-interaction-form" class="interaction-form"><h3>发表观点 / 评论 / 补充</h3><p>你的内容会保存在本场研讨中，供查看和复核。</p><div class="interaction-fields"><select v-model="interactionTarget"><option value="topic">研讨议题</option><option v-for="(row, index) in active.opinions || []" :key="index" :value="`speech:${index}`">第{{ row.round || 1 }}轮 · {{ row.expert }}</option><option v-if="active.conclusion" value="conclusion">主持人结论</option></select><select v-model="interactionKind"><option value="comment">评论</option><option value="supplement">补充</option><option value="rebuttal">反驳</option></select></div><textarea v-model="interactionContent" rows="3" maxlength="2000" placeholder="写下你的观点或待核验的问题"></textarea><button class="btn btn-primary btn-small" :disabled="!interactionContent.trim() || savingInteraction" @click="postInteraction">{{ savingInteraction ? '提交中…' : '提交互动' }}</button><div v-for="row in (active.interactions || []).filter(item => item.target === 'topic' || item.target === 'conclusion')" :key="row.id" class="interaction-row"><b>{{ row.target === 'conclusion' ? '主持人结论' : '研讨议题' }} · {{ interactionKindText(row.kind) }}</b> {{ row.content }} <small>{{ formatDate(row.created_at) }}</small></div></section>
          </section>
          <section v-if="active.conclusion" class="card smart-summary"><h2>研讨智能总结</h2><p class="summary-path">核心议题 → 各专家观点 → 共识 → 分歧 → 遗留问题 <span v-if="summaryView.source">· {{ summaryView.source }}</span></p><div class="summary-row"><strong>核心问题</strong><p>{{ active.question }}</p></div><div class="summary-row"><strong>各专家观点</strong><div><p v-for="row in summaryView.expert_views || []" :key="row.expert"><b>{{ row.expert }}：</b>{{ row.view }}</p><p v-if="!summaryView.expert_views?.length">本场记录暂无单独提取的专家观点，可查看上方各轮完整发言。</p></div></div><div class="summary-row"><strong>共识</strong><ul v-if="summaryView.consensus?.length"><li v-for="(row, index) in summaryView.consensus" :key="index">{{ row }}</li></ul><p v-else>尚无结构化共识。</p></div><div class="summary-row"><strong>分歧</strong><ul v-if="summaryView.differences?.length"><li v-for="(row, index) in summaryView.differences" :key="index">{{ row }}</li></ul><p v-else>尚无结构化分歧。</p></div><div class="summary-row"><strong>遗留问题</strong><ul v-if="summaryView.open_questions?.length"><li v-for="(row, index) in summaryView.open_questions" :key="index">{{ row }}</li></ul><p v-else>尚无结构化遗留问题。</p></div><div class="summary-row"><strong>综合结论</strong><div class="markdown-body" v-html="renderMarkdown(summaryView.overall?.slice(0, 700) + (summaryView.overall?.length > 700 ? '…' : ''))"></div></div><button class="btn btn-primary btn-small" type="button" @click="screen = 'report'">查看完整报告</button></section>
          <details v-if="active.evidence?.length" class="card evidence-card"><summary>本次参考资料 <span class="badge is-blue">{{ active.evidence.length }} 条</span></summary><ul><li v-for="(item, index) in active.evidence" :key="item.id || index"><a v-if="item.source" :href="item.source" target="_blank" rel="noopener noreferrer">{{ item.title || item.id || '未命名资料' }}</a><span v-else>{{ item.title || item.id || '未命名资料' }}</span><small>{{ item.audience && item.audience !== 'all' ? `供${item.audience}发言参考 · ` : '' }}{{ item.published_at }}</small></li></ul></details>
        </template>
      </template>
      <template v-else-if="screen === 'report' && active">
        <div class="detail-actions"><button class="back-link" type="button" @click="screen = 'detail'">← 返回研讨现场</button><button class="btn btn-primary btn-small" type="button" :disabled="active.status === 'running' || !active.conclusion" @click="downloadReport">下载 Markdown 报告</button></div>
        <article v-if="active.status === 'running'" class="card full-report"><h2>正在形成最终报告</h2><p>{{ phaseText(active.phase) }}</p><p>完成实际讨论与来源核对后，将在这里展示约500字的分段结果报告。</p></article><article v-else class="card full-report"><h2>研讨结果报告</h2><p class="report-meta">{{ active.title }} · {{ modeText(active.mode) }} · {{ briefParagraphs.length ? active.report_brief.character_count : reportCharacterCount }} 字</p><template v-if="briefParagraphs.length"><p v-for="(paragraph, i) in briefParagraphs" :key="i">{{ paragraph }}</p></template><template v-else><section v-for="section in reportSections" :key="section.title"><h3>{{ section.title }}</h3><p v-if="!section.ordered">{{ section.lines[0] }}</p><ol v-else><li v-for="(line, index) in section.lines" :key="index">{{ line }}</li></ol></section></template></article>
        <details v-if="briefParagraphs.length" class="card report-appendix"><summary>主要原文依据与报告核对</summary><p class="profile-muted">{{ active.report_brief.note }}</p><div v-for="source in active.report_brief.references || []" :key="source.id" class="report-reference"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a><small>{{ source.as_of }} · 发布 {{ source.published_at }}</small></div></details>
        <details class="card report-appendix"><summary>查看实际讨论、方案修订和收敛依据</summary><SeminarMechanism :seminar="active" /><SeminarDecisionProtocol :seminar="active" /></details>
        <details v-if="active.research" class="card research-resources"><summary>实验与证据附录（不计入报告正文）</summary><SeminarResearchPanel :seminar="active" report /></details>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SeminarResearchSetup from './components/SeminarResearchSetup.vue'
import ExpertPublicMethod from './components/ExpertPublicMethod.vue'
import SeminarKnowledgeCard from './components/SeminarKnowledgeCard.vue'
import SeminarPublicEvidenceCard from './components/SeminarPublicEvidenceCard.vue'
import SeminarDecisionProtocol from './components/SeminarDecisionProtocol.vue'
import SeminarMechanism from './components/SeminarMechanism.vue'
import ExpertMethodApplication from './components/ExpertMethodApplication.vue'
import SeminarResearchPanel from './components/SeminarResearchPanel.vue'
import { getSeminarResearchDefaults, listSeminarExpertModels, updateSeminarExpertModel } from '@/api/expertSeminar'
import { continueExpertSeminarWithEvidence, advanceExpertSeminar, createSeminarExpert, createSeminarExpertPromptVersion, createSeminarKnowledge, evaluateSeminarExpert, getExpertSeminar, getSeminarKnowledge, interactExpertSeminar, listExpertSeminars, listSeminarExpertEvaluations, listSeminarExperts, listSeminarKnowledge, retryExpertSeminar, startExpertSeminar, suggestExpertSeminar, updateSeminarExpertRetrieval, voteExpertSeminar } from '@/api/expertSeminar'

const screen = ref('home')
const question = ref('')
const title = ref('')
const keywords = ref('')
const scenario = ref('uranium')
const mode = ref('topic')
const scheduleMode = ref('serial')
const webSearch = ref(false)
const researchDraft = ref({ mode: 'experiment', engine: 'expert_agents_v1', data_mode: 'system', auto_run: true, tools: [], perturbation: 20, target_days: null, use_ontology: true, ontology_query: '', expert_data: {}, model_id: '' })
const researchPanel = ref(null)
const automaticResources = ref({})
const automaticResourceSummary = ref(null)
const automaticResourcesLoading = ref(false)
const automaticResourceError = ref('')
const automaticMethodDocuments = computed(() => knowledge.value.filter(row => (activeExpert.value?.knowledge_ids || []).includes(row.id)))
const automaticScenarioDocuments = computed(() => knowledge.value.filter(row => row.origin !== 'expert_library' && (automaticResources.value[activeExpert.value?.name]?.knowledge_ids || []).includes(row.id)))
const suggesting = ref(false)
const suggestion = ref(null)
const advancing = ref(false)
const fallbackRoles = [
  { name: 'David Simchi-Levi', description: '风险暴露与恢复时间' },
  { name: 'Yossi Sheffi', description: '组织与物流韧性' },
  { name: 'Christopher S. Tang', description: '稳健采购策略' },
  { name: 'Hau L. Lee', description: 'Triple-A供应链战略' },
  { name: 'Dmitry Ivanov', description: '可生存性与网络重构' },
  { name: '陈剑', description: '契约与博弈协调' },
  { name: '赵先德', description: '供应链整合与流程协同' },
  { name: '宋华', description: '供应链金融与交易治理' },
]
const experts = ref([])
const expertRoles = computed(() => experts.value.length ? experts.value.map(item => ({ name: item.name, description: item.role })) : fallbackRoles)
const selectedExperts = ref(fallbackRoles.slice(0, 3).map(item => item.name))
const knowledge = ref([])
const selectedKnowledge = ref([])
const knowledgeAssignments = ref({})
const uploadFromCreate = ref(false)
const knowledgeSearch = ref('')
const knowledgeScope = ref('')
const knowledgeExpert = ref('')
const expertSearch = ref('')
const expertStatus = ref('')
const activeKnowledge = ref(null)
const activeExpert = ref(null)
const activeExpertSeminars = computed(() => activeExpert.value ? history.value.filter(item => (item.experts || []).includes(activeExpert.value.name)) : [])
const expertEvaluations = ref([])
const evaluatingExpert = ref(false)
const expertEvaluationError = ref('')
const expertModelPanel = ref(null)
const expertModelProviders = ref([]), expertModelForm = ref({ provider_id: '', model_id: '' }), expertModelError = ref(''), savingExpertModel = ref(false), expertModelSaved = ref(false)
const promptVersionForm = ref({ instruction: '', description: '' })
const savingPromptVersion = ref(false)
const promptVersionError = ref('')
const retrievalForm = ref({ top_k: 5, threshold: 0.5, examples: '' })
const savingRetrieval = ref(false)
const retrievalError = ref('')
const latestExpertEvaluation = computed(() => expertEvaluations.value[0] || null)
const knowledgeFile = ref(null)
const knowledgeForm = ref({ title: '', keywords: '', source_type: '科技报告', content: '' })
const expertForm = ref({ name: '', role: '', tags: '', style: '严谨型', instruction: '' })
const modeOptions = [
  { value: 'topic', label: '定题研讨' },
  { value: 'brainstorm', label: '头脑风暴' },
  { value: 'open', label: '开放式研讨' },
  { value: 'debate', label: '观点辩论' },
  { value: 'scenario', label: '情景推演' },
  { value: 'six_hats', label: '六顶帽法研讨' },
  { value: 'delphi', label: '德尔菲研讨' },
  { value: 'red_blue', label: '红蓝对抗' },
]
const modeRoundCounts = { topic: 5, brainstorm: 5, open: 5, debate: 5, scenario: 5, six_hats: 6, delphi: 5, red_blue: 5 }
const active = ref(null)
const expandedSpeeches = ref(new Set())
const boardTab = ref('convergence')
const history = ref([])
const error = ref('')
const submitting = ref(false)
const loadingDetail = ref(false)
const retryingId = ref('')
const continuingWithEvidence = ref(false)
const savingInteraction = ref(false)
const interactionTarget = ref('topic')
const interactionKind = ref('comment')
const interactionContent = ref('')
const voterId = (() => {
  try {
    const existing = localStorage.getItem('mace_seminar_voter_id')
    if (existing) return existing
    const value = crypto.randomUUID()
    localStorage.setItem('mace_seminar_voter_id', value)
    return value
  } catch { return '00000000-0000-4000-8000-000000000001' }
})()
const voteCounts = computed(() => {
  const votes = Object.values(active.value?.votes || {})
  return { support: votes.filter(value => value === 'support').length, oppose: votes.filter(value => value === 'oppose').length }
})
const roundGroups = computed(() => {
  const groups = new Map()
  for (const [index, opinion] of (active.value?.opinions || []).entries()) {
    const number = Math.max(1, Number(opinion.round) || 1)
    if (!groups.has(number)) groups.set(number, { number, label: opinion.round_label || `第${number}轮`, opinions: [] })
    groups.get(number).opinions.push({ ...opinion, index })
  }
  return [...groups.values()].sort((a, b) => a.number - b.number)
})
const roundMetrics = computed(() => active.value?.analytics?.rounds || [])
const chartPoints = computed(() => roundMetrics.value.filter(row => row.difference_score !== null && row.difference_score !== undefined).map((row, index, rows) => ({
  ...row, x: rows.length === 1 ? 500 : 55 + index * 890 / (rows.length - 1),
  y: 170 - row.difference_score * 1.3,
})))
const chartLine = computed(() => chartPoints.value.map(row => `${row.x},${row.y}`).join(' '))
const chartDelta = computed(() => chartPoints.value.length > 1 ? chartPoints.value.at(-1).difference_score - chartPoints.value[0].difference_score : null)
const speechCounts = computed(() => (active.value?.experts || []).map(name => ({ name, count: (active.value?.opinions || []).filter(row => row.expert === name).length })))
const summaryView = computed(() => active.value?.summary || { overall: active.value?.conclusion || '', key_findings: [], risks: [], expert_views: [], consensus: [], differences: [], open_questions: [], actions: [] })
const expertTexts = computed(() => {
  const texts = new Map()
  for (const opinion of active.value?.opinions || []) {
    if (!opinion.expert) continue
    texts.set(opinion.expert, `${texts.get(opinion.expert) || ''} ${opinion.content || ''}`)
  }
  return texts
})
const matrixDimensions = computed(() => {
  const question = String(active.value?.question || '')
  const topicTerms = ['安全', '技术', '工程', '成本', '风险', '部署', '供应', '运输', '价格', '库存', '交期', '质量', '采购', '市场', '趋势', '执行']
  const inferred = topicTerms.filter(term => question.includes(term))
  const keywords = (active.value?.keywords || []).map(value => String(value).trim()).filter(value => value.length >= 2 && value.length <= 12)
  return [...new Set([...inferred, ...keywords, ...topicTerms])].slice(0, 6)
})
const matrixRows = computed(() => {
  const names = active.value?.experts?.length ? active.value.experts : [...expertTexts.value.keys()]
  if (!expertTexts.value.size) return []
  const countTerm = (content, term) => content.split(term).length - 1
  const densities = names.map(expert => {
    const content = String(expertTexts.value.get(expert) || '').replace(/\s+/g, '')
    return matrixDimensions.value.map(dimension => {
      const count = countTerm(content, dimension)
      return { dimension, count, density: content.length ? count * 1000 / content.length : 0 }
    })
  })
  const maximums = matrixDimensions.value.map((_, index) => Math.max(...densities.map(row => row[index].density), 0))
  return names.map((expert, rowIndex) => ({ expert, cells: densities[rowIndex].map((cell, index) => ({
    dimension: cell.dimension, count: cell.count,
    score: maximums[index] ? Math.round(cell.density / maximums[index] * 100) : 0,
  })) }))
})
const speechTokenSets = computed(() => [...expertTexts.value.values()].map(text => twoCharacterSet(text)))
const pointMetrics = items => (items || []).map(text => {
  const tokens = twoCharacterSet(text)
  const score = tokens.size && speechTokenSets.value.length
    ? Math.round(speechTokenSets.value.reduce((sum, speechTokens) => sum + [...tokens].filter(token => speechTokens.has(token)).length / tokens.size, 0) / speechTokenSets.value.length * 100)
    : 0
  return { text, score }
}).sort((first, second) => second.score - first.score)
const consensusPoints = computed(() => pointMetrics(summaryView.value.consensus))
const differencePoints = computed(() => pointMetrics(summaryView.value.differences))
function twoCharacterSet(value) {
  const normalized = String(value || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
  return new Set(Array.from({ length: Math.max(0, normalized.length - 1) }, (_, index) => normalized.slice(index, index + 2)))
}
const briefParagraphs = computed(() => active.value?.report_brief?.status === 'source_checked' ? active.value.report_brief.paragraphs || [] : [])
const reportSections = computed(() => {
  const summary = summaryView.value
  const sections = []
  let remaining = 1850 - String(active.value?.title || '专家研讨报告').length
  const add = (title, values, itemLimit, maxItems, ordered = true) => {
    const lines = []
    for (const value of values.slice(0, maxItems)) {
      const room = remaining - (lines.length ? 0 : title.length) - 2
      if (room < 20) break
      const line = plainExcerpt(value, Math.min(itemLimit, room))
      if (!line) continue
      lines.push(line)
      remaining -= line.length + 2
    }
    if (lines.length) sections.push({ title, lines, ordered: ordered && lines.length > 1 })
  }
  const roundCount = roundGroups.value.length
  const expertCount = active.value?.experts?.length || 0
  add('背景', [`${active.value?.question || ''} 本场由${expertCount}位专家进行${roundCount}轮研讨，以下结论仅依据本场发言及所列资料。`], 260, 1, false)
  add('结论审查状态', [active.value?.quality_gate ? ['research_supported', 'ready_for_human_review'].includes(active.value.quality_gate.status) ? '公开证据支持的研判已形成，企业执行前提单列；增量价值与创新边界见决策记录。' : '公开论证尚需完善，详见具体证据缺口及分歧。' : '旧版记录，未执行本版质量检查。'], 120, 1, false)
  add('一、核心结论', summary.key_findings?.length ? summary.key_findings : [summary.overall || '尚未形成结论'], 350, 4)
  add('二、共识', summary.consensus || [], 110, 4)
  add('三、分歧', summary.differences || [], 110, 3)
  add('四、建议', summary.actions || [], 110, 4)
  add('五、风险提示', summary.risks?.length ? summary.risks : (summary.open_questions || []).map(text => `待核验：${text}`), 110, 4)
  return sections
})
const reportCharacterCount = computed(() => String(active.value?.title || '专家研讨报告').length + reportSections.value.reduce((sum, section) => sum + section.title.length + section.lines.join('').length, 0))
const speechVoteCount = index => Object.values(active.value?.opinion_votes?.[`speech:${index}`] || {}).filter(value => value === 'support').length
const mySpeechVote = index => active.value?.opinion_votes?.[`speech:${index}`]?.[voterId.replaceAll('-', '')] || ''
const myVote = computed(() => active.value?.votes?.[voterId.replaceAll('-', '')] || '')
const searchKeyword = ref('')
const statusFilter = ref('')
const modeFilter = ref('')
const scenarioFilter = ref('')
const questionSection = ref(null)
const questionInput = ref(null)
const historySection = ref(null)
const resultSection = ref(null)
const completedCount = computed(() => history.value.filter(item => item.status === 'completed').length)
const runningCount = computed(() => history.value.filter(item => ['running', 'paused'].includes(item.status)).length)
const activeExpertCount = computed(() => experts.value.filter(item => item.status === 'active').length)
const pageTitle = computed(() => ({ hall: '研讨大厅', create: '发起研讨', detail: '研讨现场', report: '完整研讨报告', knowledge: '知识库', 'knowledge-detail': '文档详情', 'knowledge-upload': '上传知识文档', experts: '智能专家库', 'expert-detail': '专家画像', 'expert-create': '创建数字专家' }[screen.value] || '专家研讨厅'))
const filteredKnowledge = computed(() => knowledge.value.filter(item => {
  const query = knowledgeSearch.value.toLowerCase()
  return (!knowledgeScope.value || (['expert_library', 'public_evidence'].includes(knowledgeScope.value) ? item.origin === knowledgeScope.value : item.scope === knowledgeScope.value))
    && (!knowledgeExpert.value || item.expert_ids?.includes(knowledgeExpert.value))
    && (!query || `${item.title} ${item.publisher || ''} ${(item.expert_names || []).join(' ')} ${(item.keywords || []).join(' ')} ${item.summary || ''}`.toLowerCase().includes(query))
}))
const filteredExperts = computed(() => experts.value.filter(item => {
  const query = expertSearch.value.toLowerCase()
  return (!expertStatus.value || item.status === expertStatus.value)
    && (!query || `${item.name} ${item.role} ${item.school || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(query))
}))
const statusDistribution = computed(() => ['completed', 'running', 'paused', 'failed'].map(status => {
  const count = history.value.filter(item => item.status === status).length
  return { label: statusText(status), count, percent: history.value.length ? Math.round(count / history.value.length * 100) : 0 }
}))
const modeDistribution = computed(() => modeOptions.map(item => {
  const count = history.value.filter(row => (row.mode || 'topic') === item.value).length
  return { label: item.label, count, percent: history.value.length ? Math.round(count / history.value.length * 100) : 0 }
}))
const creationTrend = computed(() => Array.from({ length: 14 }, (_, index) => {
  const day = new Date()
  day.setDate(day.getDate() - 13 + index)
  const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  return { date, count: history.value.filter(item => String(item.created_at || '').startsWith(date)).length }
}))
const filteredHistory = computed(() => history.value.filter((item) => {
  const haystack = `${item.title || ''} ${item.question || ''} ${(item.keywords || []).join(' ')}`.toLowerCase()
  const matchesKeyword = !searchKeyword.value || haystack.includes(searchKeyword.value.toLowerCase())
  return matchesKeyword
    && (!statusFilter.value || item.status === statusFilter.value)
    && (!modeFilter.value || item.mode === modeFilter.value)
    && (!scenarioFilter.value || item.scenario === scenarioFilter.value)
}))
const suggestedQuestions = [
  { label: '供应中断', question: '如果哈萨克斯坦铀供应中断，未来一年我国应如何调整采购来源、运输路线与库存？' },
  { label: '运输路线', question: '从哈萨克斯坦进口铀燃料时，哪些运输环节最脆弱？关键路线中断后有哪些可行的替代方案？' },
  { label: '采购时机', question: '如果未来半年铀价持续波动，提前采购、分批采购和维持现有节奏各有什么风险与适用条件？' },
]
let timer = null
let selectedId = ''

const statusText = (value, phase) => phase === 'awaiting_experiments' ? '待执行实验' : ({ running: '进行中', paused: '待推进', completed: '已完成', failed: '未完成' }[value] || '未知状态')
const modeText = value => modeOptions.find(item => item.value === value)?.label || '定题研讨'
const scheduleText = value => ({ parallel: '并行调度', mixed: '混合调度', moderator: '主持人调度' }[value] || '串行调度')
const webStatusText = item => item.public_evidence?.source_ids?.length ? '已接入核验过的公开原文' : !item.web_search ? '系统知识库' : ({ pending: '联网检索中', completed: '已联网检索', empty: '联网无结果', failed: '联网失败' }[item.web_search_status] || '联网状态未知')
const scenarioText = value => value === 'auto' ? '汽车供应链' : '铀供应链'
const phaseText = value => ({ result_report: '正在撰写并核对约500字结果报告', professional_review: '正在独立审查事实、反例与方案依据', report_revision: '正在依据审查意见修订结论', candidate_integration: '正在依据新增证据整合完整候选方案', public_evidence: '正在检索并复核一手公开原文', targeted_evidence: '正在补证并准备定向复议', preparing: '正在准备研讨资料', expert_agents_research: '专家正在自主研究与模型实验', research_planning: '正在生成实验计划', awaiting_experiments: '等待确认数据并执行实验', research_results: '实验完成，准备讨论', research_executing: '正在执行本地实验', experts_parallel: '专家正在并行分析', synthesis: '主持人正在梳理结论', completed: '研讨已完成' }[value] || (value ? `${value}正在分析` : '研讨进行中'))
const speechReferences = opinion => new Set([...(opinion.claims || []).flatMap(row => row.source_ids || []), ...(opinion.method_application?.evidence_ids || []), ...(opinion.method_application?.method_source_ids || []), ...(opinion.peer_response?.source_ids || []), ...(opinion.ballots || []).flatMap(row => row.source_ids || [])])
const formatDate = value => value ? String(value).replace('T', ' ').slice(0, 16) : '—'
const seminarTitle = item => {
  const text = String(item?.title || item?.question || '').trim()
  return text.length > 48 ? `${text.slice(0, 48)}…` : text
}
const payload = response => response?.data || response
const renderMarkdown = value => DOMPurify.sanitize(marked.parse(String(value || ''), { gfm: true, breaks: true }), {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
})
const plainExcerpt = (value, limit = 90) => {
  const clean = String(value || '').replace(/^#{1,6}\s*/gm, '').replace(/\*\*|__|`|^---+$/gm, '').replace(/\s+/g, ' ').trim()
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean
}
const interactionKindText = value => ({ comment: '评论', supplement: '补充', rebuttal: '反驳' }[value] || '互动')

function clearPolling() {
  if (timer) clearTimeout(timer)
  timer = null
}

function showScreen(value) {
  clearPolling()
  if (value !== 'knowledge-upload') uploadFromCreate.value = false
  selectedId = ''
  active.value = null
  error.value = ''
  screen.value = value
  if (value === 'home' || value === 'hall') loadHistory()
  if (value === 'home' || value === 'experts' || value === 'knowledge') loadCatalog()
}

async function loadCatalog() {
  try {
    const [expertResponse, knowledgeResponse] = await Promise.all([listSeminarExperts(), listSeminarKnowledge()])
    experts.value = payload(expertResponse)?.items || []
    knowledge.value = payload(knowledgeResponse)?.items || []
  } catch (e) {
    error.value = e?.message || '研讨资料加载失败'
  }
}

async function openKnowledge(id) {
  error.value = ''
  try {
    activeKnowledge.value = payload(await getSeminarKnowledge(id))
    screen.value = 'knowledge-detail'
  } catch (e) { error.value = e?.message || '文档加载失败' }
}

function onKnowledgeFile(event) {
  knowledgeFile.value = event.target.files?.[0] || null
  if (knowledgeFile.value && !knowledgeForm.value.title) knowledgeForm.value.title = knowledgeFile.value.name.replace(/\.[^.]+$/, '')
}

async function saveKnowledge() {
  if (!knowledgeForm.value.title || (!knowledgeForm.value.content && !knowledgeFile.value)) return
  submitting.value = true
  error.value = ''
  try {
    const data = new FormData()
    Object.entries(knowledgeForm.value).forEach(([key, value]) => data.append(key, value))
    if (knowledgeFile.value) data.append('file', knowledgeFile.value)
    const created = payload(await createSeminarKnowledge(data))
    knowledgeForm.value = { title: '', keywords: '', source_type: '科技报告', content: '' }
    knowledgeFile.value = null
    await loadCatalog()
    if (uploadFromCreate.value) {
      if (created?.id) selectedKnowledge.value = [...selectedKnowledge.value, created.id]
      screen.value = 'create'
      uploadFromCreate.value = false
    } else screen.value = 'knowledge'
  } catch (e) { error.value = e?.message || '资料入库失败' }
  finally { submitting.value = false }
}

function openExpertModelConfig() {
  if (expertModelPanel.value) { expertModelPanel.value.open = true; expertModelPanel.value.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
}
const customExpertModel = ref(false)
const currentExpertModels = computed(() => expertModelProviders.value.find(row => row.provider_id === expertModelForm.value.provider_id)?.models || [])
const selectedExpertModelOption = computed(() => !customExpertModel.value && currentExpertModels.value.some(row => row.id === expertModelForm.value.model_id) ? expertModelForm.value.model_id : '__custom__')
function chooseExpertModel(id) {
  customExpertModel.value = id === '__custom__'
  expertModelForm.value.model_id = customExpertModel.value ? '' : id
  expertModelSaved.value = false
}
function changeExpertProvider() {
  customExpertModel.value = false
  expertModelForm.value.model_id = expertModelProviders.value.find(row => row.provider_id === expertModelForm.value.provider_id)?.default_model || ''
  expertModelSaved.value = false
}
async function saveExpertModel() {
  const id = activeExpert.value.id
  savingExpertModel.value = true; expertModelError.value = ''; expertModelSaved.value = false
  try {
    const updated = payload(await updateSeminarExpertModel(id, expertModelForm.value))
    experts.value = experts.value.map(row => row.id === id ? updated : row)
    if (activeExpert.value?.id === id) { activeExpert.value = updated; expertModelSaved.value = true }
  } catch (e) { expertModelError.value = e.message || '模型配置保存失败' }
  finally { savingExpertModel.value = false }
}
async function openExpert(item) {
  activeExpert.value = item
  expertModelForm.value = { provider_id: item.llm_config?.provider_id || '', model_id: item.llm_config?.model_id || '' }
  expertModelError.value = ''; expertModelSaved.value = false; customExpertModel.value = false
  listSeminarExpertModels().then(result => { expertModelProviders.value = payload(result).providers || [] }).catch(e => { expertModelError.value = e.message || '模型服务列表读取失败' })
  automaticResourcesLoading.value = true
  automaticResourceError.value = ''
  getSeminarResearchDefaults(scenario.value, '').then(result => {
    if (activeExpert.value?.id === item.id) {
      const value = payload(result)
      automaticResources.value = value.resources || {}
      automaticResourceSummary.value = value.summary || null
    }
  }).catch(e => { if (activeExpert.value?.id === item.id) automaticResourceError.value = e.message || '场景资源匹配暂不可用' })
    .finally(() => { if (activeExpert.value?.id === item.id) automaticResourcesLoading.value = false })
  expertEvaluations.value = []
  expertEvaluationError.value = ''
  promptVersionForm.value = { instruction: item.instruction || '', description: '' }
  promptVersionError.value = ''
  retrievalForm.value = { top_k: item.rag?.top_k ?? 5, threshold: item.rag?.threshold ?? 0.5,
    examples: (item.few_shot_examples || []).join('\n') }
  retrievalError.value = ''
  screen.value = 'expert-detail'
  try {
    const records = payload(await listSeminarExpertEvaluations(item.id))?.items || []
    if (activeExpert.value?.id === item.id) expertEvaluations.value = records
  } catch {
    // The profile remains available if the evaluation endpoint is not yet running.
  }
}

async function saveExpertPromptVersion() {
  if (!activeExpert.value || savingPromptVersion.value) return
  savingPromptVersion.value = true
  promptVersionError.value = ''
  try {
    const updated = payload(await createSeminarExpertPromptVersion(activeExpert.value.id, promptVersionForm.value))
    activeExpert.value = updated
    experts.value = experts.value.map(row => row.id === updated.id ? updated : row)
    promptVersionForm.value = { instruction: updated.instruction, description: '' }
  } catch (e) { promptVersionError.value = e?.message || '版本保存失败' }
  finally { savingPromptVersion.value = false }
}

async function saveExpertRetrieval() {
  if (!activeExpert.value || savingRetrieval.value) return
  savingRetrieval.value = true
  retrievalError.value = ''
  try {
    const updated = payload(await updateSeminarExpertRetrieval(activeExpert.value.id, {
      top_k: Number(retrievalForm.value.top_k), threshold: Number(retrievalForm.value.threshold),
      few_shot_examples: retrievalForm.value.examples.split('\n').map(row => row.trim()).filter(Boolean),
    }))
    activeExpert.value = updated
    experts.value = experts.value.map(row => row.id === updated.id ? updated : row)
  } catch (e) { retrievalError.value = e?.message || '检索配置保存失败' }
  finally { savingRetrieval.value = false }
}

async function onResearchUpdated(result) {
  active.value = result
  await open(result.seminar_id)
}

async function runExpertEvaluation() {
  if (!activeExpert.value || evaluatingExpert.value) return
  const id = activeExpert.value.id
  evaluatingExpert.value = true
  expertEvaluationError.value = ''
  try {
    const record = payload(await evaluateSeminarExpert(id))
    if (activeExpert.value?.id === id) expertEvaluations.value = [record, ...expertEvaluations.value]
  } catch (e) {
    if (activeExpert.value?.id === id) expertEvaluationError.value = e?.message || '评测失败，请稍后重试'
  } finally { evaluatingExpert.value = false }
}

async function saveExpert() {
  if (!expertForm.value.name || !expertForm.value.role || !expertForm.value.instruction) return
  submitting.value = true
  error.value = ''
  try {
    await createSeminarExpert({ ...expertForm.value, tags: expertForm.value.tags.replace(/，/g, ',').split(',').map(x => x.trim()).filter(Boolean) })
    expertForm.value = { name: '', role: '', tags: '', style: '严谨型', instruction: '' }
    await loadCatalog()
    screen.value = 'experts'
  } catch (e) { error.value = e?.message || '专家创建失败' }
  finally { submitting.value = false }
}

function useExpert(item) {
  selectedExperts.value = [item.name]
  focusQuestion()
}

function focusQuestion() {
  clearPolling()
  selectedId = ''
  active.value = null
  error.value = ''
  screen.value = 'create'
  loadCatalog()
  nextTick(() => questionInput.value?.focus())
}

function backToHall() {
  clearPolling()
  selectedId = ''
  active.value = null
  error.value = ''
  screen.value = 'hall'
  loadHistory()
}

function resetFilters() {
  searchKeyword.value = ''
  statusFilter.value = ''
  modeFilter.value = ''
  scenarioFilter.value = ''
}

function useSuggestion(value) {
  question.value = value
  nextTick(() => questionInput.value?.focus())
}

async function loadHistory() {
  try { history.value = payload(await listExpertSeminars())?.items || [] }
  catch (e) { error.value = e?.message || '历史记录加载失败' }
}

async function open(id, desiredScreen = null) {
  const destination = desiredScreen || (selectedId === id && screen.value === 'report' ? 'report' : 'detail')
  selectedId = id
  clearPolling()
  error.value = ''
  loadingDetail.value = true
  screen.value = destination
  try {
    const result = payload(await getExpertSeminar(id))
    if (selectedId !== id) return
    active.value = result
    if (result?.status === 'running') timer = setTimeout(() => open(id), 2000)
    else loadHistory()
  } catch (e) {
    if (selectedId === id) error.value = e?.message || '研讨记录读取失败'
  } finally {
    loadingDetail.value = false
  }
}

async function getSuggestion() {
  if (!question.value.trim() || suggesting.value) return
  suggesting.value = true
  suggestion.value = null
  error.value = ''
  try { suggestion.value = payload(await suggestExpertSeminar(question.value.trim(), scenario.value)) }
  catch (e) { error.value = e?.message || '智能建议生成失败' }
  finally { suggesting.value = false }
}

async function recommendExperts() {
  if (!question.value.trim() || suggesting.value) return
  suggesting.value = true
  error.value = ''
  try {
    const row = payload(await suggestExpertSeminar(question.value.trim(), scenario.value))
    const matches = (row.experts || []).filter(name => expertRoles.value.some(item => item.name === name))
    if (matches.length) selectedExperts.value = matches
    suggestion.value = row
  } catch (e) { error.value = e?.message || '专家推荐失败' }
  finally { suggesting.value = false }
}

function applySuggestion() {
  const row = suggestion.value
  if (!row) return
  title.value = row.title || ''
  question.value = row.question || question.value
  keywords.value = Array.isArray(row.keywords) ? row.keywords.join('，') : ''
  mode.value = row.mode || 'topic'
  scheduleMode.value = row.schedule_mode || 'serial'
  selectedExperts.value = Array.isArray(row.experts) ? row.experts.filter(name => expertRoles.value.some(item => item.name === name)) : selectedExperts.value
  suggestion.value = null
}

async function submit() {
  if (!question.value.trim() || !selectedExperts.value.length || submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    const result = payload(await startExpertSeminar(question.value.trim(), scenario.value, {
      title: title.value.trim(), keywords: keywords.value.trim(),
      mode: mode.value, schedule_mode: scheduleMode.value,
      experts: [...selectedExperts.value],
      knowledge_ids: [...selectedKnowledge.value],
      knowledge_assignments: Object.fromEntries(selectedKnowledge.value.map(id => [id, selectedExperts.value.includes(knowledgeAssignments.value[id]) ? knowledgeAssignments.value[id] : 'all'])),
      web_search: webSearch.value,
      research_mode: researchDraft.value.mode,
      research_config: researchDraft.value.mode === 'experiment' ? { ...researchDraft.value, expert_data: Object.fromEntries(selectedExperts.value.map(name => [name, researchDraft.value.expert_data[name] || experts.value.find(row => row.name === name)?.research_resources?.dataset || {}])) } : null,
    }))
    if (!result?.seminar_id) throw new Error('研讨启动后未返回会话编号')
    question.value = ''
    title.value = ''
    keywords.value = ''
    await loadHistory()
    await open(result.seminar_id)
  } catch (e) {
    error.value = e?.message || '研讨启动失败'
  } finally {
    submitting.value = false
  }
}

async function continueWithEvidence() {
  if (!active.value?.seminar_id || continuingWithEvidence.value) return
  continuingWithEvidence.value = true
  error.value = ''
  try {
    const result = payload(await continueExpertSeminarWithEvidence(active.value.seminar_id))
    active.value = result
    await open(result.seminar_id)
  } catch (e) { error.value = e?.message || '补证复议启动失败' }
  finally { continuingWithEvidence.value = false }
}

async function advance() {
  if (!active.value?.seminar_id || advancing.value) return
  advancing.value = true
  error.value = ''
  try {
    await advanceExpertSeminar(active.value.seminar_id)
    await open(active.value.seminar_id)
  } catch (e) { error.value = e?.message || '推进专家发言失败' }
  finally { advancing.value = false }
}

async function retry(id) {
  if (!id || retryingId.value) return
  retryingId.value = id
  error.value = ''
  try {
    const result = payload(await retryExpertSeminar(id))
    active.value = result
    await loadHistory()
    await open(id)
  } catch (e) {
    error.value = e?.message || '重新研讨失败'
  } finally {
    retryingId.value = ''
  }
}

async function vote(stance) {
  if (!active.value?.seminar_id) return
  error.value = ''
  try { active.value = payload(await voteExpertSeminar(active.value.seminar_id, voterId, stance)) }
  catch (e) { error.value = e?.message || '投票失败' }
}

async function voteOpinion(index) {
  if (!active.value?.seminar_id) return
  error.value = ''
  try { active.value = payload(await voteExpertSeminar(active.value.seminar_id, voterId, 'support', `speech:${index}`)) }
  catch (e) { error.value = e?.message || '观点投票失败' }
}

function jumpToSpeech(index) {
  document.getElementById(`seminar-speech-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function commentOn(index) {
  interactionTarget.value = `speech:${index}`
  interactionKind.value = 'comment'
  document.getElementById('seminar-interaction-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function toggleSpeech(index) {
  const next = new Set(expandedSpeeches.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expandedSpeeches.value = next
}

function downloadReport() {
  if (!active.value) return
  const row = active.value
  if (briefParagraphs.value.length) {
    const lines = ['# 研讨结果报告', '', row.title || '', '', ...briefParagraphs.value.flatMap(value => [value, '']), '## 原文依据', '']
    for (const source of row.report_brief.references || []) lines.push(`- [${source.title}](${source.url}) · ${source.as_of || source.published_at || ''}`)
    lines.push('', row.report_brief.note || '')
    saveReportMarkdown(lines, row)
    return
  }
  const lines = [`# ${row.title || '专家研讨报告'}`, '', `${scenarioText(row.scenario)} · ${modeText(row.mode)} · ${formatDate(row.created_at)}`, '']
  for (const section of reportSections.value) lines.push(`## ${section.title}`, ...section.lines.map(line => `- ${line}`), '')
  if (row.research?.experiments?.length) {
    lines.push('## 实验与证据附录（不计入正文）', '')
    for (const record of row.research.experiments) lines.push(`### ${record.display_code} · ${record.expert} · ${record.label}`, record.hypothesis, `结果：${record.outcome}`, `来源：${record.data_source || '未提供'}；窗口：${record.window || '未提供'}`, '```json', JSON.stringify(record, null, 2), '```', '')
    lines.push('### 本体关联快照', '```json', JSON.stringify(row.research.ontology || {}, null, 2), '```', '')
  }
  if (row.deliberation_policy) {
    lines.push('## 收敛、审查与决策记录', '', '各Agent按真实学者公开方法执行分析；所用步骤、事实与复算分别记录，发言由AI生成，学者本人未参与。', '```json', JSON.stringify({ policy: row.deliberation_policy, deliberation: row.deliberation, decision: row.decision_record, quality_gate: row.quality_gate, audit: row.decision_audit }, null, 2), '```', '')
  }
  lines.push('## 参考资料', '')
  for (const source of row.evidence || []) lines.push(`- [${source.id || ''}] ${source.title || '未命名资料'} ${source.source || ''}`)
  for (const expert of Object.values(row.expert_profile_snapshots || {})) {
    lines.push(`### ${expert.name} · ${expert.school || expert.role}`, expert.disclosure || '')
    for (const source of expert.sources || []) lines.push(`- [${source.id}] ${source.title} ${source.url}`)
  }
  lines.push('完整逐轮发言请在研讨现场查看。')
  saveReportMarkdown(lines, row)
}

function saveReportMarkdown(lines, row) {
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `专家研讨报告-${row.seminar_id?.slice(0, 8) || 'report'}.md`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function postInteraction() {
  if (!active.value?.seminar_id || !interactionContent.value.trim() || savingInteraction.value) return
  savingInteraction.value = true
  error.value = ''
  try {
    await interactExpertSeminar(active.value.seminar_id, { target: interactionTarget.value, kind: interactionKind.value, content: interactionContent.value.trim() })
    interactionContent.value = ''
    await open(active.value.seminar_id)
  } catch (e) { error.value = e?.message || '互动提交失败' }
  finally { savingInteraction.value = false }
}

onMounted(() => { loadHistory(); loadCatalog(); const params = new URLSearchParams(window.location.search); const id = params.get('seminar'); if (/^[a-f0-9]{32}$/.test(id || '')) open(id, params.get('view') === 'report' ? 'report' : 'detail') })
onBeforeUnmount(() => { clearPolling(); selectedId = '' })
</script>

<style scoped>
.report-appendix{padding:18px 22px;margin:14px 0}.report-appendix>summary{cursor:pointer;color:#245b99;font-weight:600}.report-reference{margin:12px 0;line-height:1.7}.report-reference a{color:#1b65b8}.report-reference small{display:block;color:#7c8ba0}.full-report>p:not(.report-meta){font-size:14px;text-align:justify;margin:18px 0;line-height:2}

.latest-finding{padding:20px;margin:16px 0;line-height:1.9}.latest-finding h3{color:#184a85;font-size:16px;margin:0 0 10px}.latest-finding p,.latest-finding li{font-size:13px;color:#3f5573}.latest-finding ul{padding-left:22px}

.automatic-docs{display:grid;gap:10px;margin:12px 0}.automatic-docs button{text-align:left;line-height:1.7}.automatic-docs small{margin-left:8px;color:#78899f}.automatic-resources h4{font-size:13px;color:#244f7c;margin:18px 0 6px}

.profile-fold>summary{cursor:pointer;font-size:16px;font-weight:600;color:#174d8b;padding-bottom:6px}

.research-resources{margin:16px 0;padding:20px}.research-resources>summary{cursor:pointer;font-size:14px;font-weight:600;color:#244f7c}.resource-docs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:14px 0;max-height:240px;overflow:auto}.resource-docs label{display:flex;gap:7px;font-size:12px;color:#4c6480}.speech-research-links{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0}.speech-research-links small{color:#7b8da5;font-size:11px}
.seminar-page{min-height:100%;padding:24px 28px 64px;background:#f2f6fc;color:#16233b;font:14px/1.6 -apple-system,'PingFang SC','Microsoft YaHei',sans-serif;box-sizing:border-box}
.seminar-page *{box-sizing:border-box}
.seminar-wrap{max-width:1180px;margin:0 auto}
.module-nav{display:flex;align-items:center;gap:5px;margin:-24px -28px 18px;padding:0 max(20px,calc((100% - 1180px)/2));min-height:48px;background:linear-gradient(100deg,#103574,#2467c8);color:#fff}
.module-nav strong{font-size:15px;margin-right:12px;white-space:nowrap}.module-nav button{height:46px;padding:0 11px;border:0;border-bottom:2px solid transparent;background:transparent;color:#eef5ff;font:inherit;cursor:pointer}.module-nav button.active,.module-nav button:hover{border-bottom-color:#fff;color:#fff}
.home-hero{position:relative;overflow:hidden;padding:30px 28px;margin:16px 0;border-radius:14px;background:linear-gradient(115deg,#0c2d69,#1c61c6);color:#fff}.home-hero:before,.home-hero:after{content:'';position:absolute;width:210px;height:210px;border-radius:50%;background:#5da0ff;opacity:.12;right:-35px;top:-80px}.home-hero:after{right:70px;top:95px}.home-hero h1{position:relative;margin:0 0 8px;font-size:23px}.home-hero p{position:relative;max-width:690px;margin:0 0 19px;font-size:13px;line-height:1.8}.home-hero>div{position:relative;display:flex;gap:8px}.btn-light{border:1px solid #fff;background:#fff;color:#1558b8}.btn-outline{border:1px solid #aac9f6;background:#ffffff12;color:#fff}
.home-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.home-metrics>div{padding:16px}.home-metrics strong{display:block;color:#1d66d1;font-size:28px;line-height:1.2}.home-metrics span{display:block;margin-top:5px;color:#5b6b84;font-size:12px}
.home-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.home-panel{min-width:0;padding:16px;margin-bottom:0}.home-panel h2{margin:0 0 13px;font-size:15px}.home-panel table{width:100%;border-collapse:collapse;font-size:12px}.home-panel th,.home-panel td{padding:8px 7px;border-bottom:1px solid #dbe6f5;text-align:left;vertical-align:top}.home-panel th{color:#536781;font-weight:600}.home-panel td{color:#48607f}.home-panel td:first-child{max-width:280px}.table-link{border:0;padding:0;background:none;color:#1558b8;cursor:pointer;text-align:left;font:inherit}.table-link:hover{text-decoration:underline}.count-accent{color:#1e6fd9}
.distribution-row{display:flex;align-items:center;gap:10px;margin:9px 0;font-size:12px}.distribution-row>span{width:85px;white-space:nowrap;color:#5b6b84}.distribution-row b{width:20px;text-align:right}.bar-track{flex:1;height:11px;border-radius:5px;background:#e7eef8;overflow:hidden}.bar-track i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#78aaf2,#236bd4)}.trend-panel{margin-top:14px}.trend-bars{display:flex;align-items:flex-end;justify-content:space-between;gap:6px;height:130px}.trend-bars>div{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:end;height:100%}.trend-bars span{width:min(100%,30px);min-height:3px;border-radius:4px 4px 0 0;background:#4d90e9}.trend-bars small{margin-top:5px;color:#71809a;font-size:9px}
.detail-document{padding:20px;margin-top:13px}.detail-document h2{margin:0 0 8px;font-size:20px}.detail-document h3{margin:20px 0 8px;font-size:15px}.detail-document>p{color:#5b6b84}.detail-document pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;line-height:1.7;color:#33465f}.detail-document a{color:#1558b8}
.expert-profile-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:12px 0 18px}.expert-profile-heading h2{margin:0;color:#102d55;font-size:21px}.expert-profile-heading p{margin:3px 0 0;color:#5b6b84;font-size:13px}.expert-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.expert-profile-card{min-width:0;padding:18px 20px}.expert-profile-card h3{margin:0 0 14px;font-size:16px;color:#102d55}.expert-profile-card h4{margin:18px 0 8px;font-size:14px}.profile-list{margin:0}.profile-list>div{display:grid;grid-template-columns:105px minmax(0,1fr);gap:12px;padding:10px 6px;border-bottom:1px solid #dbe6f5}.profile-list dt{color:#536b8c;font-weight:600;font-size:12px}.profile-list dd{margin:0;min-width:0;color:#18365c;overflow-wrap:anywhere}.profile-tag{margin:0 5px 4px 0}.profile-muted{color:#617590;font-size:12px;line-height:1.65}.profile-prompt-head{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #dbe6f5;border-bottom:1px solid #dbe6f5}.profile-prompt{padding:12px;background:#f5f8fd;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;color:#243e60;line-height:1.75}.profile-activity{display:flex;align-items:baseline;gap:10px;padding:12px 0;border-top:1px solid #dbe6f5;border-bottom:1px solid #dbe6f5}.profile-activity strong{font-size:24px;color:#1768c8}.profile-activity span{color:#617590;font-size:12px}.profile-recent>div{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid #dbe6f5}.profile-recent small{flex:none;color:#8493aa}.profile-id{font-family:ui-monospace,Consolas,monospace;font-size:12px}
.profile-version-table{overflow-x:auto}.profile-version-row{display:grid;grid-template-columns:56px 60px 54px minmax(90px,1fr) 92px;align-items:center;gap:7px;min-width:425px;padding:9px 5px;border-bottom:1px solid #dbe6f5;font-size:12px}.profile-version-head{color:#536b8c;font-weight:600}.profile-prompt-details{margin-top:14px}.profile-prompt-details summary{color:#1558b8;cursor:pointer;font-weight:600}
.profile-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.profile-section-head h3{margin-bottom:8px}.profile-score{display:grid;grid-template-columns:95px minmax(0,1fr) 40px;align-items:center;gap:9px;margin:9px 0;font-size:12px}.profile-score .bar-track i{display:block;height:100%;background:#3185cf;border-radius:10px}.profile-score b{text-align:right}.profile-evaluation-record{display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #dbe6f5;font-size:12px}.profile-evaluation-record small{color:#71809a}.profile-error{color:#c43333;font-size:12px}
.profile-method{margin:2px 0 12px;color:#64758c;font-size:11px;line-height:1.65}.profile-method summary{width:max-content;cursor:pointer;color:#64758c}.profile-method p{margin:7px 0 0;padding-left:13px}
.profile-note{display:block;margin-top:5px;font-size:11px;color:#71839d;line-height:1.6}.profile-rag-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.profile-prompt-details .field{margin-top:12px}.profile-prompt-details .field input,.profile-prompt-details .field textarea,.profile-prompt-details .field select{width:100%}
.speech-evidence{margin:9px 0;color:#687b95;font-size:11px}.speech-evidence summary{width:max-content;cursor:pointer}.speech-evidence ul{margin:7px 0;padding-left:20px}.speech-evidence li{margin:3px 0}.speech-evidence small{margin-left:8px;color:#8393a8}
.field textarea{display:block;width:100%;padding:10px 11px;border:1px solid #c6d6ec;border-radius:8px;background:#fff;color:#16233b;font:inherit;resize:vertical}.reference-choices{margin-top:15px;padding-top:14px;border-top:1px solid #e5edf8;max-height:245px;overflow-y:auto}.reference-choices strong{display:block;margin-bottom:8px;font-size:13px}.reference-choices label{display:flex;align-items:center;gap:8px;padding:7px 0;color:#425c7c;font-size:12px}.reference-choices label span{flex:1}.reference-choices input{accent-color:#1e6fd9}.reference-choices small{color:#8290a5}
.breadcrumb{font-size:12px;color:#70819b;margin-bottom:10px}
.heading-row{display:flex;align-items:center;justify-content:space-between;gap:20px}
.heading-row h1{font-size:22px;line-height:1.35;margin:0 0 3px;font-weight:700}
.heading-row p{margin:0;color:#5b6b84;font-size:13px}
.seminar-nav{display:flex;align-items:center;gap:6px;margin:18px 0 16px;border-bottom:1px solid #dbe6f5}
.seminar-nav button{padding:9px 16px;border:0;border-bottom:2px solid transparent;background:transparent;color:#5b6b84;font:inherit;cursor:pointer}
.seminar-nav button:hover{color:#1558b8}
.seminar-nav button.active{color:#1558b8;border-bottom-color:#1e6fd9;font-weight:700}
.btn{min-height:38px;padding:8px 16px;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}
.btn-primary{color:#fff;border:1px solid #1558b8;background:linear-gradient(120deg,#1558b8,#1e6fd9);box-shadow:0 1px 4px rgba(30,111,217,.2)}
.btn-primary:hover{filter:brightness(1.08)}
.btn-secondary{color:#1558b8;border:1px solid #9ec0ec;background:#fff}
.btn-secondary:hover{background:#eef6ff}
.btn-small{min-height:32px;padding:5px 12px;font-size:12px}
.btn:disabled{opacity:.55;cursor:not-allowed}
.card{background:#fff;border:1px solid #dbe6f5;border-radius:12px;box-shadow:0 1px 3px rgba(30,111,217,.05)}
.filter-card{display:flex;flex-wrap:wrap;align-items:end;gap:10px;padding:14px 16px;margin-bottom:18px}
.field{min-width:0;margin-bottom:15px}.filter-card .field{flex:1 1 150px;margin:0}.filter-card .search-field{flex:2 1 220px}
.field label{display:block;margin-bottom:5px;color:#273b58;font-size:13px;font-weight:600}
.field em{color:#d43c3c;font-style:normal}
.field input,.field select{width:100%;min-height:39px;padding:8px 11px;border:1px solid #c6d6ec;border-radius:8px;background:#fff;color:#16233b;font:inherit}
.field input:focus,.field select:focus{outline:2px solid #d6e8ff;border-color:#1e6fd9}
.filter-reset{flex:0 0 auto}
.list-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 10px}
.list-heading h2{margin:0;font-size:16px}.list-heading h2 span{margin-left:4px;color:#1e6fd9}
.list-heading>span{color:#71809a;font-size:12px}
.seminar-list{display:grid;gap:10px}
.seminar-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px}
.seminar-item:hover{box-shadow:0 3px 10px rgba(30,111,217,.1)}
.seminar-item-main{min-width:0;flex:1}
.item-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}
.seminar-item-title{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;border:0;background:none;color:#1558b8;font-size:15px;font-weight:700;text-align:left;cursor:pointer}
.seminar-item-title:hover{text-decoration:underline}
.seminar-item-main p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 6px;color:#5b6b84;font-size:12px}
.meta-line,.topic-head{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
.badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:10px;background:#eef1f6;color:#5b6b84;font-size:11.5px;white-space:nowrap}
.badge.is-completed,.badge.is-blue{background:#e3eefc;color:#1558b8}
.badge.is-running,.badge.is-green{background:#e8f7ef;color:#17a35c}
.badge.is-paused{background:#fff4d9;color:#9a6400}
.badge.is-failed{background:#fdecec;color:#d43c3c}
.badge.is-neutral{background:#eef1f6;color:#5b6b84}
.meta-time{color:#8694aa;font-size:12px}
.meta-keywords{color:#71809a;font-size:11.5px}
.empty-state{text-align:center;padding:42px 16px}.empty-state .empty-icon{font-size:32px;color:#9fc1ee}.empty-state strong{display:block;margin:6px 0 3px}.empty-state p{margin:0 0 14px;color:#71809a;font-size:13px}
.step-hint{margin:0 0 14px;color:#5b6b84;font-size:12.5px}
.create-card,.expert-card{padding:18px 20px;margin-bottom:14px}
.card-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.card-heading h2{margin:0;font-size:16px}.card-heading>span{color:#71809a;font-size:12px}
.create-card :deep(.el-textarea__inner){min-height:130px!important;padding:10px 12px;border-radius:8px;box-shadow:0 0 0 1px #c6d6ec inset;font-size:14px;line-height:1.65}
.create-card :deep(.el-textarea__inner:focus){box-shadow:0 0 0 1px #1e6fd9 inset}
.suggestion-result{margin-top:10px;padding:12px;border:1px solid #b8d3f7;border-radius:8px;background:#f1f7ff;color:#28486e}.suggestion-result p{margin:5px 0;font-size:12px}.suggestion-result button{margin-top:6px}.web-search-choice{display:flex;align-items:center;gap:8px;margin:14px 0 3px;font-weight:600;color:#1558b8}.web-search-choice input{accent-color:#1e6fd9}
.expert-select-actions{display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 12px}
.reference-row{display:flex;align-items:center;gap:8px}.reference-row label{flex:1;min-width:0}.reference-row select{max-width:160px;padding:4px;border:1px solid #c6d6ec;border-radius:6px;color:#425c7c;background:#fff}
.field-hint{margin-top:5px;color:#71809a;font-size:11.5px}
.topic-suggestions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:12px 0 14px;border-top:1px solid #eef2f8}
.topic-suggestions strong{margin-right:3px;color:#5b6b84;font-size:12px}
.topic-suggestions button{padding:5px 10px;border:1px solid #cfe0f6;border-radius:16px;background:#eef6ff;color:#1558b8;font-size:12px;cursor:pointer}
.topic-suggestions button:hover{background:#dcecff}
.scenario-field{max-width:240px;margin:0}.scenario-field :deep(.el-select){width:100%}
.setting-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.setting-grid .field{margin-bottom:7px}.setting-grid :deep(.el-select){width:100%}
.settings-summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #eef2f8}
.settings-summary span{padding:6px 10px;border-radius:8px;background:#f0f6ff;color:#5b6b84;font-size:12px}
.settings-summary b{margin-left:5px;color:#1558b8}
.sources-card{padding:18px 20px;margin-bottom:14px}.sources-card p{margin:0;color:#5b6b84;font-size:13px;line-height:1.7}
.expert-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.expert-grid>label,.expert-grid>div{display:flex;flex-direction:column;align-items:flex-start;min-width:0;padding:12px;border:1px solid #dbe6f5;border-radius:9px;background:#f8fbff}
.expert-grid>label{position:relative;cursor:pointer}.expert-grid>label.selected{border-color:#8db9ef;background:#f0f7ff}.expert-grid>label input{position:absolute;top:12px;right:12px;width:16px;height:16px;accent-color:#1e6fd9}
.expert-mark{display:inline-grid;place-items:center;width:27px;height:27px;margin-bottom:8px;border-radius:7px;background:#e3eefc;color:#1558b8;font-size:11px;font-weight:800}
.expert-mark.host{background:#e8f7ef;color:#17a35c}
.expert-grid strong{font-size:13px}.expert-grid small{margin-top:3px;color:#71809a;font-size:11px}
.form-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}
.alert{margin:12px 0}
.detail-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}.back-link{padding:0;border:0;background:none;color:#1558b8;font:inherit;font-size:13px;cursor:pointer}
.back-link:hover{text-decoration:underline}
.loading-state{padding:30px;text-align:center;color:#71809a}
.topic-card{padding:18px 20px;margin-bottom:14px}.topic-card h2{margin:12px 0 6px;font-size:18px;line-height:1.55}.topic-card p{margin:0;color:#71809a;font-size:12px}
.topic-card .topic-question{margin-bottom:8px;color:#435874;font-size:13px}
.topic-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.topic-card .topic-flow{margin-top:8px}
.vote-card{display:flex;align-items:center;flex-wrap:wrap;gap:9px;padding:12px 18px;margin-bottom:14px}.vote-card strong{font-size:13px}.vote-card>span{color:#8290a5;font-size:11px}.vote-card>div{display:flex;gap:8px;margin-left:auto}.vote-card .selected{border-color:#1e6fd9;background:#e7f1ff}
.dashboard-card{margin-bottom:14px;padding:0 18px}.dashboard-card summary{display:flex;align-items:center;gap:10px;padding:13px 0;cursor:pointer;font-weight:700;list-style:none}.dashboard-card summary::-webkit-details-marker{display:none}.dashboard-card summary::before{content:'▸';color:#253f59;font-size:12px;transition:transform .15s}.dashboard-card[open] summary::before{transform:rotate(90deg)}.dashboard-card summary span{color:#71809a;font-size:12px;font-weight:400}
.dashboard-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0 0 14px}.dashboard-grid>div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px;border:1px solid #dbe6f5;border-radius:8px;background:#f8fbff}.dashboard-grid strong{color:#1558b8;font-size:18px}.dashboard-grid span{color:#71809a;font-size:11.5px}
.board-heading{display:flex;align-items:baseline;gap:10px;padding:16px 0 10px}.board-heading strong{font-size:15px}.board-heading span{color:#71809a;font-size:12px}.board-tabs{display:flex;gap:7px;flex-wrap:wrap;padding-bottom:12px}.board-tabs button{padding:6px 15px;border:1px solid #9dbdde;border-radius:19px;background:#fff;color:#245174;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.board-tabs button.active{background:#22617c;border-color:#22617c;color:#fff}.board-panel{min-height:190px;padding:10px 0 18px}.board-panel h3{margin:7px 0;font-size:13px}.board-panel ul{margin:5px 0;padding-left:18px}.board-panel li{margin:5px 0;font-size:12.5px;color:#33465f}.board-explain,.board-method,.board-empty{margin:0 0 8px;color:#71809a;font-size:12px}.board-explain strong{color:#245174}.board-method{margin-top:8px;font-size:11px}.curve-summary{display:flex;align-items:baseline;gap:12px;margin:12px 0 2px}.curve-summary strong{color:#1c5876;font-size:18px}.curve-summary span{color:#71809a;font-size:12px}.curve-wrap{width:100%;overflow-x:auto}.curve-wrap svg{display:block;width:100%;min-width:520px;height:auto;overflow:visible}.curve-wrap text{font-size:14px;fill:#7890aa}.curve-wrap .chart-grid{stroke:#dce6f2;stroke-width:1}.curve-wrap .chart-line{fill:none;stroke:#2d7394;stroke-width:3;stroke-linejoin:round}.curve-wrap .chart-dot{fill:#2d7394;stroke:#fff;stroke-width:2}.curve-wrap .chart-value{font-weight:700;fill:#1c3e5b}.matrix-scroll{overflow-x:auto}.opinion-matrix{width:100%;min-width:580px;border-collapse:collapse;text-align:left}.opinion-matrix th,.opinion-matrix td{padding:10px;border:1px solid #dbe6f5;vertical-align:top;font-size:12px}.opinion-matrix thead th{background:#f3f8ff;color:#245174}.opinion-matrix tbody th{min-width:105px;color:#284260}.opinion-matrix td button{border:0;padding:0;background:none;color:#1558b8;text-align:left;cursor:pointer;font:inherit;line-height:1.6}.opinion-matrix td span{color:#9aa7b7}.board-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.board-columns>div{padding:10px;border:1px solid #e1eaf5;border-radius:8px;background:#fafcff}.board-columns p{color:#8190a5;font-size:12px}
.opinion-heatmap{width:100%;min-width:650px;border-collapse:separate;border-spacing:3px;text-align:center}.opinion-heatmap th{padding:8px 4px;color:#62738e;font-size:12px;font-weight:600}.opinion-heatmap thead th:first-child{width:125px}.opinion-heatmap tbody th{text-align:left;white-space:nowrap;color:#33465f;font-weight:500}.opinion-heatmap td{padding:0}.heat-cell{display:grid;place-items:center;min-height:40px;border-radius:4px;color:#1e354d;font-size:12px}.point-group{margin:12px 0 18px}.point-group h3{margin:0 0 7px!important;font-size:14px!important}.consensus-title{color:#159d58}.difference-title{color:#d84242}.point-row{display:grid;grid-template-columns:190px minmax(0,1fr) 40px;align-items:center;gap:10px;margin:8px 0}.point-label{overflow:hidden;color:#526783;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.point-track{height:18px;overflow:hidden;border-radius:5px;background:#e7edf6}.point-track i{display:block;height:100%;border-radius:5px}.point-track .is-consensus{background:#19a361}.point-track .is-difference{background:#df4141}.point-row strong{color:#21344d;font-size:12px;text-align:right}
.discussion-card{padding:18px 20px}.discussion-sub{margin:-6px 0 14px;color:#71809a;font-size:12.5px}
.running-tag{color:#17a35c!important;font-weight:600}
.speech-stats{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 14px}.speech-stats>span:first-child{color:#71809a;font-size:12px}
.round-title{margin:10px 0 10px;padding-left:9px;border-left:3px solid #1e6fd9;color:#1558b8;font-size:13px;font-weight:700}
.round-title span{margin-left:10px;color:#71809a;font-size:11px;font-weight:400}.round-count{display:inline-block;padding:4px 10px;border-radius:18px;background:#eff5fa;color:#24405c;font-size:14px}.seminar-round{margin:15px 0 24px}.seminar-round .message-card{scroll-margin-top:90px}.speech-actions{display:flex;align-items:center;gap:8px;margin-top:10px}.speech-actions button{padding:6px 11px;border:1px solid #dae4ef;border-radius:6px;background:#f4f7fb;color:#49647e;font:inherit;font-size:11px;cursor:pointer}.speech-actions button.selected{background:#e5f1ff;border-color:#70a9ed;color:#1558b8}.speech-actions span{color:#8a98ab;font-size:11px}
.message-card{padding:13px 15px;margin-bottom:10px;border:1px solid #dbe6f5;border-radius:10px;background:#fff}
.message-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.message-head strong{font-size:13.5px}.message-head small{margin-left:auto;color:#8a98ab;font-size:11px}
.speaker-avatar{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#e3eefc;color:#1558b8;font-size:11px;font-weight:800}
.moderator-card{background:#f5f9ff;border-color:#bcd5f3}.moderator-avatar{background:#d8eafe;color:#0d47a1}
.message-card p{margin:10px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;color:#33465f;font-size:13.5px;line-height:1.75}
.speech-preview{line-height:1.8!important}.speech-toggle{margin:6px 0 3px;padding:0;border:0;background:none;color:#1558b8;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.speech-toggle:hover{text-decoration:underline}
.markdown-body{overflow-wrap:anywhere;color:#33465f;font-size:13.5px;line-height:1.8}.markdown-body :deep(p){margin:10px 0;white-space:normal;font-size:inherit;line-height:inherit}.markdown-body :deep(h1),.markdown-body :deep(h2),.markdown-body :deep(h3),.markdown-body :deep(h4){margin:18px 0 7px;color:#1d4b72;font-size:14px;line-height:1.45}.markdown-body :deep(h1){font-size:16px}.markdown-body :deep(h2){font-size:15px}.markdown-body :deep(h3){font-size:14px}.markdown-body :deep(h4){font-size:13.5px}.markdown-body :deep(ul),.markdown-body :deep(ol){margin:7px 0;padding-left:22px}.markdown-body :deep(li){margin:4px 0}.markdown-body :deep(blockquote){margin:12px 0;padding:7px 12px;border-left:3px solid #8db9ef;background:#f5f9ff;color:#516985}.markdown-body :deep(blockquote p){margin:0}.markdown-body :deep(hr){margin:16px 0;border:0;border-top:1px solid #dbe6f5}.markdown-body :deep(code){padding:1px 4px;border-radius:4px;background:#eef4fb;font-size:12px}.markdown-body :deep(pre){overflow-x:auto;padding:10px;border-radius:7px;background:#f3f7fc}.markdown-body :deep(pre code){padding:0;background:none}.markdown-body :deep(table){display:block;overflow-x:auto;max-width:100%;border-collapse:collapse}.markdown-body :deep(th),.markdown-body :deep(td){padding:6px 9px;border:1px solid #dbe6f5;text-align:left}.markdown-body :deep(a){color:#1558b8;text-decoration:underline}.markdown-body :deep(> :first-child){margin-top:8px}.markdown-body :deep(> :last-child){margin-bottom:4px}
.interaction-form{margin-top:20px;padding-top:15px;border-top:1px solid #dbe6f5}.interaction-form h3{margin:0;font-size:15px}.interaction-form>p{margin:3px 0 10px;color:#71809a;font-size:12px}.interaction-fields{display:flex;gap:8px;margin-bottom:9px}.interaction-fields select{min-height:34px;padding:5px 9px;border:1px solid #c6d6ec;border-radius:7px;background:#fff}.interaction-form textarea{display:block;width:100%;margin-bottom:9px;padding:9px;border:1px solid #c6d6ec;border-radius:8px;font:inherit;resize:vertical}.interaction-row{margin-top:10px;padding:9px 11px;border-left:3px solid #8db9ef;background:#f5f9ff;color:#405671;font-size:12px;white-space:pre-wrap}.interaction-row b{color:#1558b8}.interaction-row small{margin-left:8px;color:#8a98ab}
.waiting-state{display:flex;justify-content:center;align-items:center;gap:9px;padding:26px;color:#71809a;font-size:13px}
.spinner{width:17px;height:17px;border:2px solid #c5dcf5;border-top-color:#1e6fd9;border-radius:50%;animation:spin .8s linear infinite}
.evidence-card{margin-top:14px;padding:14px 18px}.evidence-card summary{cursor:pointer;font-weight:700}.evidence-card ul{margin:12px 0 0;padding-left:18px}.evidence-card li{margin:7px 0;color:#5b6b84;font-size:12px}.evidence-card a{color:#1558b8}.evidence-card small{margin-left:8px;color:#8a98ab}
.smart-summary{margin-top:14px;padding:18px 20px}.smart-summary h2{margin:0;font-size:15px}.summary-path{margin:8px 0 14px;color:#71809a;font-size:12px}.summary-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:11px 5px;border-bottom:1px solid #dbe6f5}.summary-row>strong{color:#536c89;font-size:12px}.summary-row p{margin:0;white-space:pre-wrap;color:#283f5c;font-size:12.5px;line-height:1.7}.summary-row p+p{margin-top:7px}.summary-row ul{margin:0;padding-left:18px}.summary-row li{margin:3px 0;color:#283f5c;font-size:12.5px}.smart-summary>.btn{margin-top:12px}.full-report{padding:26px 30px}.full-report h2{margin:0;font-size:21px}.full-report h3{margin:25px 0 9px;padding-bottom:6px;border-bottom:1px solid #dbe6f5;font-size:16px}.full-report h4{margin:15px 0 7px;color:#1558b8}.full-report p,.full-report li{white-space:pre-wrap;color:#33465f;line-height:1.8}.full-report .report-meta{color:#8290a5;font-size:12px}.report-speech{padding:12px 0;border-bottom:1px solid #edf2f8}.full-report a{color:#1558b8}
.full-report .report-note{margin-top:22px;padding-top:12px;border-top:1px solid #dbe6f5;color:#71809a;font-size:12px}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:850px){.expert-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.setting-grid{grid-template-columns:1fr 1fr}.seminar-page{padding:18px 16px 48px}.module-nav{margin:-18px -16px 15px;padding:0 16px}.home-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.heading-row{align-items:flex-start;flex-direction:column}.filter-card .field,.filter-card .search-field{flex:1 1 100%}.filter-reset{width:100%}.seminar-item{align-items:flex-start;flex-direction:column}.seminar-item .btn{align-self:flex-end}.expert-grid{grid-template-columns:1fr 1fr}.expert-profile-grid{grid-template-columns:1fr}.expert-profile-heading{align-items:flex-start;flex-direction:column}.profile-list>div{grid-template-columns:88px minmax(0,1fr)}.profile-recent>div{flex-direction:column;gap:2px}.setting-grid{grid-template-columns:1fr}.card-heading{align-items:flex-start;flex-direction:column}.scenario-field{max-width:none}.form-actions .btn{flex:1}.seminar-page{padding:14px 12px 36px}.module-nav{margin:-14px -12px 15px;padding:0 9px;overflow-x:auto}.module-nav strong{display:none}.module-nav button{white-space:nowrap}.home-columns{grid-template-columns:1fr}.home-hero{padding:22px 17px}.home-hero>div{flex-wrap:wrap}.board-columns{grid-template-columns:1fr}.summary-row{grid-template-columns:1fr}.full-report{padding:17px}}
</style>
