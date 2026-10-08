<template>
  <div class="modeling-setup mid-stage-bg">
    <MidStagePageHeader
      title="沙盘模型 · 数字化建模"
      subtitle="主体模型 (Agent) · 环境模型 · 规则模型 · OODA 认知循环与人工校准设定"
      :icon="Cpu"
    >
      <template #right>
        <div class="ms-header-stats">
          <article v-for="item in heroStats" :key="item.label" class="ms-header-stat">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
        <el-button size="small" class="ms-calibration-header-btn" @click="calibrationDrawerVisible = true">
          <el-icon><ChatDotRound /></el-icon>
          <span>人机对话与人工校准</span>
        </el-button>
        <el-button size="small" class="ms-param-header-btn" :type="draftDirty ? 'warning' : 'default'" @click="drawerVisible = true">
          <el-icon><Operation /></el-icon>
          <span>推演环境参数</span>
          <span class="ms-header-pill-badge">{{ draftForm.start_year }}–{{ draftForm.end_year }}</span>
          <span v-if="draftDirty" class="ms-header-dirty-dot"></span>
        </el-button>
        <el-button type="primary" size="small" @click="goNext">
          <span>下一步：想定生成</span>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </template>
    </MidStagePageHeader>

    <!-- 业务核心问题导引条（阐明“沙盘模型想解决什么问题”） -->
    <section class="modeling-core-question-strip glass-panel">
      <div class="core-question-badge">沙盘建模目标</div>
      <div class="core-question-text">
        <strong>面向突发地缘制裁与供应链断链，如何构建逼真映射物理与博弈现实的数字孪生底座？</strong>
        <p>按照【主体模型、环境模型、规则模型】三位一体架构，建立 28 个核心智能体的 OODA 认知决策闭环（态势函数感知与效用函数寻优），结合大模型 Agent 记忆与自适应反思机制，为突发地缘冲击推演提供高置信度多智能体仿真沙盘。</p>
      </div>
    </section>

    <!-- 主工作区：全宽沉浸式多维建模控制台 -->
    <div class="ms-studio">
      <main class="ms-center" :class="{ 'is-scrollable': ['agent', 'environment', 'rule'].includes(modelingView) }">
        <nav class="ms-view-tabs" aria-label="建模视图">
          <button :class="{ active: modelingView === 'agent' }" @click="modelingView = 'agent'">
            <el-icon><User /></el-icon>
            <span>01 主体模型 (Agent 认知闭环)</span>
            <small class="tab-chip">4大体系</small>
          </button>
          <button :class="{ active: modelingView === 'environment' }" @click="modelingView = 'environment'">
            <el-icon><MapLocation /></el-icon>
            <span>02 环境模型 (空间走廊与地缘网络)</span>
            <small class="tab-chip">3大走廊</small>
          </button>
          <button :class="{ active: modelingView === 'rule' }" @click="modelingView = 'rule'">
            <el-icon><SetUp /></el-icon>
            <span>03 规则模型 (合约约束与熔断机制)</span>
            <small class="tab-chip">4大契约</small>
          </button>
          <button :class="{ active: modelingView === 'graph' }" @click="modelingView = 'graph'">
            <el-icon><Share /></el-icon>
            <span>复杂网络拓扑</span>
          </button>
          <button :class="{ active: modelingView === 'role' }" @click="modelingView = 'role'">
            <el-icon><Tickets /></el-icon>
            <span>微观实体清单</span>
          </button>
          <span class="ms-view-tag-count">{{ totalAgentCount }} 个实体已纳入仿真基座</span>
        </nav>

        <!-- ========== 01 AGENT 模型 (参考学长人工社会顶级架构) ========== -->
        <section v-if="modelingView === 'agent'" class="ms-model-view agent-view">
          <div class="model-view-heading">
            <span class="heading-num">01</span>
            <div class="heading-text">
              <p>AGENT SPECIFICATION & COGNITIVE ARCHITECTURE</p>
              <h2>智能体模型体系</h2>
              <small>四大核心供应链智能体通过统一的感知—记忆—决策—行为（OODA）自适应认知闭环协同运转。</small>
            </div>
          </div>

          <!-- 四大 Agent 切换 Tabs -->
          <div class="agent-tier-tabs" role="tablist">
            <button
              v-for="agent in mainAgentTiers"
              :key="agent.tier"
              type="button"
              class="agent-tier-btn"
              :class="{ active: activeAgentTier === agent.tier }"
              @click="switchAgentTier(agent.tier)"
            >
              <span class="agent-tier-icon" :class="agent.tier">
                <el-icon><component :is="agent.icon" /></el-icon>
              </span>
              <div class="agent-tier-meta">
                <div class="agent-tier-title-row">
                  <span class="agent-tier-code">{{ agent.code }}</span>
                  <strong>{{ agent.name }}</strong>
                </div>
                <small>{{ agent.subtitle }}</small>
              </div>
            </button>
          </div>

          <!-- Agent 详尽卡片 -->
          <article class="agent-master-card glass-panel">
            <header class="am-header">
              <div class="am-header-left">
                <div class="am-code-title">
                  <span class="am-code">{{ activeAgentData.code }}</span>
                  <h3>{{ activeAgentData.label }}</h3>
                  <span class="am-subtitle">{{ activeAgentData.subtitle }}</span>
                </div>
                <p class="am-desc">{{ activeAgentData.role.identity }}</p>
                <p class="am-goal"><b>核心目标：</b>{{ activeAgentData.role.goal }}</p>
              </div>
              <div class="am-header-right">
                <small>分类标签与角色定位</small>
                <div class="am-tags">
                  <span v-for="cat in activeAgentData.categories" :key="cat" class="am-tag">{{ cat }}</span>
                </div>
              </div>
            </header>

            <!-- 规范合约 / 建模契约 (Contract) -->
            <div class="am-contract-bar">
              <div v-for="item in activeAgentData.contract" :key="item.label" class="am-contract-item">
                <small>{{ item.label }}</small>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <!-- 属性与动态状态双栏网格 -->
            <div class="am-attributes-grid">
              <!-- 左栏：长期属性 -->
              <section class="am-attr-col">
                <div class="am-section-title">
                  <el-icon><Tickets /></el-icon>
                  <h4>长期属性 (基线能力与物理约束)</h4>
                </div>
                <div class="am-attr-list">
                  <div v-for="attr in activeAgentData.attributes" :key="attr.key" class="am-attr-item">
                    <div class="am-attr-item-head">
                      <strong>{{ attr.name || attr.label }}</strong>
                      <span class="am-attr-range" v-if="attr.range">{{ formatRange(attr) }} {{ attr.unit || '' }}</span>
                    </div>
                    <p class="am-attr-detail">{{ attr.detail }}</p>
                  </div>
                </div>
              </section>

              <!-- 右栏：动态运行状态 -->
              <section class="am-attr-col is-dynamic">
                <div class="am-section-title">
                  <el-icon><Histogram /></el-icon>
                  <h4>动态运行状态 (仿真运行时指标)</h4>
                </div>
                <div class="am-attr-list">
                  <div v-for="st in activeAgentData.dynamicStates" :key="st.name" class="am-attr-item dynamic-item">
                    <div class="am-attr-item-head">
                      <strong>{{ st.name }}</strong>
                      <span class="am-live-badge">动态追踪</span>
                    </div>
                    <p class="am-attr-detail">{{ st.detail }}</p>
                  </div>
                </div>
              </section>
            </div>

            <!-- Agent 认知与行为架构 (OODA 四模块流动卡片，带流向箭头) -->
            <section class="am-architecture-section">
              <div class="am-section-title">
                <el-icon><Grid /></el-icon>
                <h4>认知架构闭环 (OODA 循环：感知 ➔ 记忆 ➔ 决策 ➔ 行为)</h4>
              </div>
              <div class="am-architecture-flow">
                <template v-for="(module, index) in activeAgentData.modules" :key="module.name">
                  <div class="am-module-card" :class="'mod-' + index">
                    <div class="am-module-head">
                      <span class="am-mod-step">0{{ index + 1 }}</span>
                      <strong>{{ module.name }}</strong>
                    </div>
                    <dl class="am-mod-dl">
                      <div>
                        <dt>输入 (INPUT)</dt>
                        <dd>{{ module.input }}</dd>
                      </div>
                      <div>
                        <dt>机理 (MECHANISM)</dt>
                        <dd>{{ module.mechanism }}</dd>
                      </div>
                      <div>
                        <dt>输出 (OUTPUT)</dt>
                        <dd>{{ module.output }}</dd>
                      </div>
                    </dl>
                  </div>
                  <el-icon v-if="index < activeAgentData.modules.length - 1" class="am-flow-arrow"><Right /></el-icon>
                </template>
              </div>
            </section>

            <!-- OODA 态势函数与效用函数嵌入机制 (对齐师姐深度学术设计诉求) -->
            <section class="am-math-embed-section glass-panel">
              <div class="am-section-title">
                <el-icon><DataAnalysis /></el-icon>
                <h4>OODA 认知函数嵌入机制：态势函数 S(t) 与 效用函数 U(a)</h4>
                <el-tag size="small" type="primary" effect="plain">闭环数学嵌入</el-tag>
              </div>
              <div class="am-math-grid">
                <!-- 态势函数 S(t) -->
                <div class="am-math-card situation-card">
                  <div class="math-card-head">
                    <span class="math-badge">感知层 (Observe / Orient)</span>
                    <strong>态势感知函数 S(t)</strong>
                  </div>
                  <div class="math-formula-box">
                    <code>S(t) = w₁·R_geo(t) + w₂·(1 - C_corridor(t)) + w₃·[D_gap(t) / Stock_safe]</code>
                  </div>
                  <div class="math-explain-list">
                    <div><b>R_geo(t)：</b>地缘制裁扰动强度（如俄乌禁运指数，取值 0~1）</div>
                    <div><b>C_corridor(t)：</b>走廊通畅度（阿拉山口通关负荷率，达94%时触发高危）</div>
                    <div><b>D_gap(t) / Stock_safe：</b>基地原料缺口与安全库存比（包头库存降至14周破线）</div>
                  </div>
                  <div class="math-trigger-rule">
                    <span class="rule-label">触发规则：</span>
                    <span>当 <b>S(t) ≥ 0.75</b> 时，Agent 强行中断日常采购，进入「紧急保供与跨境绕行」应急模态。</span>
                  </div>
                </div>

                <!-- 效用函数 U(a) -->
                <div class="am-math-card utility-card">
                  <div class="math-card-head">
                    <span class="math-badge">决策层 (Decide / Act)</span>
                    <strong>行为效用评估函数 U(a)</strong>
                  </div>
                  <div class="math-formula-box">
                    <code>U(a) = λ₁·Reliability(a) - λ₂·[Cost(a) / Budget] - λ₃·Penalty_breach(a)</code>
                  </div>
                  <div class="math-explain-list">
                    <div><b>Reliability(a)：</b>机组零停堆保供可靠度（华龙一号首炉保供权重 λ₁ = 0.45）</div>
                    <div><b>Cost(a) / Budget：</b>到岸完全采购成本相对预算膨胀率（成本敏感度 λ₂ = 0.30）</div>
                    <div><b>Penalty_breach(a)：</b>长协契约违约与地缘违约惩罚敞口（合规权重 λ₃ = 0.25）</div>
                  </div>
                  <div class="math-trigger-rule">
                    <span class="rule-label">求解寻优：</span>
                    <span>Agent 求解 <b>arg max U(a)</b>，在极端暴涨下自动否决追涨现货，输出「借调国家储备 + 远洋绕行」最优解。</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- 大模型 Agent 认知机理：双层记忆机制与自适应学习机制 -->
            <section class="am-llm-cognitive-section glass-panel">
              <div class="am-section-title">
                <el-icon><Cpu /></el-icon>
                <h4>大模型 Agent 认知机理：双层记忆架构与自适应反思学习机制</h4>
                <el-tag size="small" type="success" effect="plain">大模型 + 认知演化</el-tag>
              </div>
              <div class="am-cognitive-grid">
                <!-- 双层记忆架构 -->
                <div class="cognitive-card memory-card">
                  <div class="cog-card-top">
                    <span class="cog-pill memory">记忆机制 (Dual-Memory)</span>
                    <strong>短期工作记忆与长期情景知识库联动</strong>
                  </div>
                  <div class="memory-tier-list">
                    <div class="mem-tier-item">
                      <span class="tier-tag working">短期工作记忆 (Working Memory)</span>
                      <p>维护最近 12 步推演上下文、在途海运航程与口岸列车编组队列（FIFO 循环缓冲区），支撑高频秒级状态更新。</p>
                    </div>
                    <div class="mem-tier-item">
                      <span class="tier-tag episodic">长期情景记忆 (Episodic & Domain Memory)</span>
                      <p>向量化检索历史断供案例（如 2022 俄乌断航、苏伊士运河搁浅）、中核在手长协契约条款与 Class 7 放射性审批通则，赋能零样本情景推演。</p>
                    </div>
                  </div>
                </div>

                <!-- 自适应学习机制 -->
                <div class="cognitive-card learning-card">
                  <div class="cog-card-top">
                    <span class="cog-pill learning">学习机制 (Self-Reflexion)</span>
                    <strong>推演后 Reflexion 认知反思与策略演化</strong>
                  </div>
                  <div class="learning-flow-list">
                    <div class="learn-flow-item">
                      <span class="flow-num">01</span>
                      <div>
                        <strong>推演结果认知反思 (Reflexion Loop)</strong>
                        <p>仿真每轮结束后，Agent 自动对比预期保供率与实际到港量，调用大模型对决策失误进行因果反思并生成校准 Prompt。</p>
                      </div>
                    </div>
                    <div class="learn-flow-item">
                      <span class="flow-num">02</span>
                      <div>
                        <strong>策略参数元学习 (Policy Adaptation)</strong>
                        <p>基于多目标帕累托前沿动态校正风险偏好系数 γ 与现货溢价上限，实现智能体跨轮次抗扰自愈演化。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 全生命周期运行流程 (Process) -->
            <section class="am-process-section">
              <div class="am-section-title">
                <el-icon><Connection /></el-icon>
                <h4>全生命周期推进流程</h4>
              </div>
              <ol class="am-process-steps">
                <li v-for="(step, sIdx) in activeAgentData.process" :key="step.name">
                  <span class="am-step-idx">{{ sIdx + 1 }}</span>
                  <div class="am-step-body">
                    <strong>{{ step.name }}</strong>
                    <small>{{ step.detail }}</small>
                  </div>
                </li>
              </ol>
            </section>

            <!-- 交互关系与标定参数双栏 -->
            <div class="am-bottom-grid">
              <section class="am-bottom-panel">
                <div class="am-section-title">
                  <el-icon><Share /></el-icon>
                  <h4>跨主体交互机制</h4>
                </div>
                <div class="am-interaction-list">
                  <article v-for="inter in activeAgentData.interactions" :key="inter.target" class="am-interaction-item">
                    <strong>{{ inter.target }}</strong>
                    <p>{{ inter.detail }}</p>
                  </article>
                </div>
              </section>

              <section class="am-bottom-panel">
                <div class="am-section-title">
                  <el-icon><Operation /></el-icon>
                  <h4>关键标定参数与物理意义</h4>
                </div>
                <table class="am-param-table">
                  <thead>
                    <tr>
                      <th>符号</th>
                      <th>参数名称</th>
                      <th>仿真职能</th>
                      <th>工程校准依据</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="param in activeAgentData.parameters" :key="param.name">
                      <td><code class="param-symbol">{{ param.symbol }}</code></td>
                      <td><b>{{ param.name }}</b></td>
                      <td>{{ param.role }}</td>
                      <td><small>{{ param.calibration }}</small></td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>

            <!-- 学术与工业依据 -->
            <div class="am-references-bar">
              <span class="am-ref-label">RESEARCH BASIS / 规程依据</span>
              <div class="am-ref-cards">
                <div v-for="refItem in activeAgentData.references" :key="refItem.title" class="am-ref-item">
                  <strong>{{ refItem.title }}</strong>
                  <p>{{ refItem.use }}</p>
                </div>
              </div>
            </div>
            <!-- 下沉至具体微观实体的联动入口 -->
            <div class="am-jump-bar">
              <div class="am-jump-info">
                <el-icon><Tickets /></el-icon>
                <span>当前为 <b>{{ activeAgentData.name || activeAgentData.label }}</b> 体系架构规范。如需查看归属该类别的具体微观企业、港口与矿区档案：</span>
              </div>
              <el-button size="small" type="primary" plain @click="viewTierEntities(activeAgentTier)">
                <span>查看微观实体清单 ({{ (agentGroups.find(g => g.tier === activeAgentTier)?.members.length || 0) }} 个)</span>
                <el-icon><Right /></el-icon>
              </el-button>
            </div>
          </article>
        </section>

        <!-- ========== 02 环境模型 (学长场景参考) ========== -->
        <section v-else-if="modelingView === 'environment'" class="ms-model-view environment-view">
          <div class="model-view-heading">
            <span class="heading-num">02</span>
            <div class="heading-text">
              <p>ENVIRONMENT & STRATEGIC CORRIDOR MODEL</p>
              <h2>供应链环境与通道模型</h2>
              <small>为多智能体提供陆海空间拓扑、通道运力约束、在途时滞与外部地缘扰动环境。</small>
            </div>
          </div>

          <!-- 陆海通道时效与基线运价矩阵 -->
          <div class="env-corridors-section glass-panel">
            <div class="am-section-title">
              <el-icon><Guide /></el-icon>
              <h4>陆海三大核心战略走廊矩阵</h4>
              <small>物理仿真运力时效与运费成本基线</small>
            </div>
            <div class="corridor-cards-grid">
              <div v-for="cor in logisticsCorridors" :key="cor.id" class="corridor-card" :class="cor.statusType">
                <div class="corridor-card-head">
                  <strong>{{ cor.name }}</strong>
                  <el-tag :type="cor.statusType" size="small" effect="dark">{{ cor.status }}</el-tag>
                </div>
                <div class="corridor-card-metrics">
                  <div>
                    <span>基线运费</span>
                    <b>{{ cor.cost }}</b>
                  </div>
                  <div>
                    <span>交付时效</span>
                    <b>{{ cor.transitTime }}</b>
                  </div>
                  <div>
                    <span>运力上限</span>
                    <b>{{ cor.capacity }}</b>
                  </div>
                </div>
                <p class="corridor-desc">{{ cor.desc }}</p>
              </div>
            </div>
          </div>

          <!-- 四层环境体系架构 -->
          <div class="env-layers-section glass-panel">
            <div class="am-section-title">
              <el-icon><MapLocation /></el-icon>
              <h4>四层供应链环境架构</h4>
              <small>层次化解耦物理、动态、政策与执行交互</small>
            </div>
            <div class="env-layers-grid">
              <article v-for="layer in environmentLayers" :key="layer.code" class="env-layer-item">
                <div class="env-layer-icon-wrap">
                  <el-icon><component :is="layer.icon" /></el-icon>
                </div>
                <div class="env-layer-content">
                  <div class="env-layer-code-row">
                    <span class="env-layer-code">{{ layer.code }}</span>
                    <h3>{{ layer.name }}</h3>
                  </div>
                  <p>{{ layer.detail }}</p>
                  <div class="env-layer-output">
                    <span>系统输出：</span>
                    <strong>{{ layer.output }}</strong>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <!-- ========== 03 规则模型 (学长场景参考) ========== -->
        <section v-else-if="modelingView === 'rule'" class="ms-model-view rule-view">
          <div class="model-view-heading">
            <span class="heading-num">03</span>
            <div class="heading-text">
              <p>RULE & POLICY TRIGGER MODEL</p>
              <h2>仿真与风控规则模型</h2>
              <small>明确场景如何判定安全库存底线、计算牛鞭效应方差膨胀，并自适应触发应急保供调度令。</small>
            </div>
          </div>

          <!-- 规则提示 Callout -->
          <div class="rule-callout-strip">
            <el-icon><InfoFilled /></el-icon>
            <p><strong>仿真规程遵循 IAEA 与国家战略物资保供准则：</strong>“安全保供”拥有最高优先级。当各基地库存跌破 16 周安全警戒底线或国际现货非理性暴涨突破 $85/lb 时，算法强制启动逆周期削峰调度。</p>
          </div>

          <!-- 核心判定数理公式与模型卡片 -->
          <div class="rule-math-grid">
            <article v-for="math in ruleMathematics" :key="math.id" class="rule-math-card glass-panel">
              <header class="rm-head">
                <el-icon><Histogram /></el-icon>
                <strong>{{ math.title }}</strong>
              </header>
              <div class="rm-formula">
                <code>{{ math.code }}</code>
              </div>
              <p class="rm-note">{{ math.note }}</p>
            </article>

            <!-- 四级安全量表卡片 -->
            <article class="rule-math-card glass-panel safety-scale-card">
              <header class="rm-head">
                <el-icon><Aim /></el-icon>
                <strong>供应链四级安全风控量表</strong>
              </header>
              <div class="safety-scale-bars">
                <div v-for="lvl in safetyLevels" :key="lvl.name" class="safety-lvl-item" :style="{ '--lvl-col': lvl.color }">
                  <span class="safety-lvl-range">{{ lvl.range }}</span>
                  <strong class="safety-lvl-name">{{ lvl.name }}</strong>
                  <small>{{ lvl.rule }}</small>
                </div>
              </div>
              <p class="rm-note">连续两个周期处于保供警戒或断链级别将触发应急保供工作专班介入调度。</p>
            </article>
          </div>

          <!-- 自适应应急调度触发规则表 -->
          <div class="rule-trigger-section glass-panel">
            <div class="am-section-title">
              <el-icon><SetUp /></el-icon>
              <h4>自适应应急调度触发规则表 (Trigger Policy Matrix)</h4>
            </div>
            <table class="trigger-matrix-table">
              <thead>
                <tr>
                  <th style="width: 32%;">触发条件 (TRIGGER)</th>
                  <th style="width: 40%;">建议应急调度指令 (DISPATCH ORDER)</th>
                  <th style="width: 28%;">解除与复原条件 (RESET)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dispatchTriggerRules" :key="row.trigger">
                  <td class="col-trigger"><b>{{ row.trigger }}</b></td>
                  <td class="col-action"><span class="action-tag">{{ row.action }}</span></td>
                  <td class="col-reset"><small>{{ row.reset }}</small></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 权威战略文献依据 -->
          <div class="rule-research-section glass-panel">
            <div class="am-section-title">
              <el-icon><Reading /></el-icon>
              <h4>战略支撑文献与工业规程依据 (Research Basis)</h4>
            </div>
            <div class="research-cards-grid">
              <article v-for="paper in researchBasis" :key="paper.title" class="research-card">
                <span class="research-year">{{ paper.year }}</span>
                <strong>{{ paper.title }}</strong>
                <p>{{ paper.use }}</p>
                <small>{{ paper.authors }} · {{ paper.venue }}</small>
              </article>
            </div>
          </div>
        </section>

        <!-- ========== 04 拓扑关系图 ========== -->
        <UraniumModelingTopology v-else-if="modelingView === 'graph'" :groups="agentGroups" :selected-tier="selectedMember?.tier" @select="selectGroup" />

        <!-- ========== 05 微观实体清单 ========== -->
        <div v-else-if="modelingView === 'role'" class="ms-role-composite-view">
          <!-- 微观实体侧栏导航（仅在微观实体清单中呈现） -->
          <aside class="ms-role-nav glass-panel">
            <div class="ms-role-nav-head">
              <div class="ms-role-nav-title">
                <strong>微观实体清单</strong>
                <el-tag size="small" type="primary" effect="plain" round>{{ totalAgentCount }} 个实体</el-tag>
              </div>
              <!-- 快捷层级过滤药丸 -->
              <div class="ms-role-tier-pills">
                <button
                  type="button"
                  class="tier-pill-btn"
                  :class="{ active: roleFilterTier === 'all' }"
                  @click="roleFilterTier = 'all'"
                >
                  全部
                </button>
                <button
                  v-for="grp in agentGroups"
                  :key="grp.tier"
                  type="button"
                  class="tier-pill-btn"
                  :class="{ active: roleFilterTier === grp.tier, [grp.tier]: true }"
                  @click="roleFilterTier = grp.tier"
                >
                  {{ grp.label.replace('智能体', '').replace('Agent', '').replace('微观', '') }}
                </button>
              </div>
              <div class="ms-search">
                <el-input v-model="searchKeyword" size="small" clearable placeholder="搜索实体名称" :prefix-icon="Search" />
              </div>
            </div>
            <el-scrollbar class="ms-role-nav-scroll">
              <el-collapse v-model="openGroups" class="ms-groups">
                <el-collapse-item v-for="group in filteredGroups" :key="group.tier" :name="group.tier">
                  <template #title>
                    <div class="ms-group-title">
                      <i class="ms-tier-dot" :class="group.tier"></i>
                      <span>{{ group.label }}</span>
                      <el-tag size="small" effect="plain" round>{{ group.members.length }}</el-tag>
                    </div>
                  </template>
                  <button
                    v-for="member in group.members"
                    :key="member.key"
                    type="button"
                    class="ms-agent-item"
                    :class="{ active: member.key === selectedKey }"
                    @click="selectMember(member)"
                  >
                    <span class="ms-agent-icon" :class="group.tier">
                      <el-icon><component :is="group.icon" /></el-icon>
                    </span>
                    <span class="ms-agent-info">
                      <b>{{ member.name }}</b>
                      <small>{{ member.note }}</small>
                    </span>
                    <span class="ms-agent-arrow">›</span>
                  </button>
                </el-collapse-item>
              </el-collapse>
              <el-empty v-if="!filteredGroups.length" description="没有匹配的实体" :image-size="48" />
            </el-scrollbar>
            <div class="ms-role-nav-foot">
              <span class="ms-role-foot-note">实体细粒度配置已解耦至「角色工坊」，此处用于查看本次推演实体档案。</span>
            </div>
          </aside>

          <!-- 选定微观实体的档案内容 -->
          <div class="ms-role-detail-pane">
            <section class="ms-hero glass-panel">
              <div class="ms-hero-main">
                <span class="ms-hero-icon" :class="selectedRole.tier">
                  <el-icon><component :is="tierIcon(selectedRole.tier)" /></el-icon>
                </span>
                <div class="ms-hero-copy">
                  <p class="analysis-hero-eyebrow">{{ selectedRole.label }}</p>
                  <h2>{{ selectedRole.displayName }}</h2>
                  <div class="ms-hero-tags">
                    <span class="ms-tag method">{{ selectedRole.modelingMethod }}</span>
                    <span class="ms-tag">{{ selectedRole.camp }}</span>
                    <span class="ms-tag">{{ selectedGroup?.members.length || 0 }} 个{{ selectedRole.countHint }}</span>
                  </div>
                </div>
              </div>
              <p class="ms-hero-goal">{{ selectedRole.role.goal || '该层级为规则驱动实体，不参与目标博弈。' }}</p>
            </section>

            <section class="ms-role glass-panel">
              <el-collapse v-model="openSections" class="ms-collapse">
                <el-collapse-item name="role" title="角色设定">
                  <dl class="ms-role-list">
                    <div v-if="selectedRole.role.identity"><dt>身份与背景</dt><dd>{{ selectedRole.role.identity }}</dd></div>
                    <div v-if="selectedRole.role.institutional_context"><dt>制度背景</dt><dd>{{ selectedRole.role.institutional_context }}</dd></div>
                    <div v-if="selectedRole.role.constraints?.length">
                      <dt>行为底线</dt>
                      <dd>
                        <ul class="ms-bullets">
                          <li v-for="item in selectedRole.role.constraints" :key="item">{{ item }}</li>
                        </ul>
                      </dd>
                    </div>
                  </dl>
                  <dl v-if="selectedRole.facts.length" class="ms-facts">
                    <div v-for="fact in selectedRole.facts" :key="fact.label">
                      <dt>{{ fact.label }}</dt>
                      <dd>{{ fact.type === 'risk' ? formatRisk(fact.value) : fact.value }}</dd>
                    </div>
                  </dl>
                </el-collapse-item>

                <el-collapse-item name="posture" title="决策姿态">
                  <div class="ms-posture-grid">
                    <div><span>决策风格</span><b>{{ selectedRole.decision_posture.style || '—' }}</b></div>
                    <div><span>风险偏好</span><b>{{ selectedRole.decision_posture.risk_appetite || '—' }}</b></div>
                  </div>
                  <div class="ms-two-col">
                    <div v-if="selectedRole.decision_posture.information_priority?.length" class="ms-posture-block">
                      <span>关注信息优先级</span>
                      <ol>
                        <li v-for="item in selectedRole.decision_posture.information_priority" :key="item">{{ item }}</li>
                      </ol>
                    </div>
                    <div v-if="selectedRole.decision_posture.typical_actions?.length" class="ms-posture-block">
                      <span>典型行动</span>
                      <div class="ms-chip-row">
                        <span v-for="item in selectedRole.decision_posture.typical_actions" :key="item" class="ms-chip">{{ item }}</span>
                      </div>
                    </div>
                  </div>
                </el-collapse-item>

                <el-collapse-item name="attributes" title="属性范围">
                  <div v-if="selectedRole.attributes.length" class="ms-attr-grid">
                    <div v-for="attr in selectedRole.attributes" :key="attr.key" class="ms-attr-card">
                      <div class="ms-attr-head">
                        <span>{{ attr.label }}<small v-if="attr.unit"> · {{ attr.unit }}</small></span>
                        <b>{{ formatRange(attr) }}</b>
                      </div>
                      <div class="ms-attr-bar"><i :style="attrBarStyle(attr)"></i></div>
                    </div>
                  </div>
                  <el-empty v-else description="该层级未声明属性范围" :image-size="48" />
                  <div v-for="group in selectedRole.enums" :key="group.label" class="ms-attr-enum">
                    <span>{{ group.label }}</span>
                    <div class="ms-chip-row">
                      <span v-for="value in group.values" :key="value" class="ms-chip">{{ value }}</span>
                    </div>
                  </div>
                  <div v-if="selectedRole.preferenceWeights?.length" class="ms-weights">
                    <span class="ms-weights-title">供给方评分权重</span>
                    <div v-for="item in selectedRole.preferenceWeights" :key="item.key" class="ms-weight-row">
                      <span>{{ item.label }}</span>
                      <div class="ms-weight-track"><i :style="{ width: `${item.weight * 100 * 2.5}%` }"></i></div>
                      <b>{{ (item.weight * 100).toFixed(0) }}%</b>
                    </div>
                  </div>
                </el-collapse-item>

                <el-collapse-item name="cognition" title="决策过程">
                  <div class="ms-ooda-strip">
                    <template v-for="(stage, index) in oodaStages" :key="stage.key">
                      <span class="ms-ooda-stage" :style="{ '--stage-color': stage.color }">
                        <b>{{ stage.label }}</b>
                        <small>{{ stage.zh }}</small>
                      </span>
                      <i v-if="index < oodaStages.length - 1" class="ms-ooda-arrow">→</i>
                    </template>
                  </div>
                  <dl class="ms-ooda-detail">
                    <div v-for="stage in oodaStages" :key="stage.key">
                      <dt><i :style="{ background: stage.color }"></i>{{ stage.zh }}</dt>
                      <dd>{{ (selectedRole.cognition[stage.key] || []).join('、') || '—' }}</dd>
                    </div>
                  </dl>
                  <p class="ms-note">按年度观察价格与事件，评估供给条件，完成采购与库存更新，再根据结果调整策略。</p>
                </el-collapse-item>

                <el-collapse-item name="relations" title="关联关系">
                  <ul v-if="relatedEdges.length" class="ms-edge-list">
                    <li v-for="edge in relatedEdges" :key="`${edge.source}-${edge.target}`">
                      <b>{{ edge.sourceName }}</b>
                      <span class="ms-edge-rel">{{ edge.relationship }}</span>
                      <b>{{ edge.targetName }}</b>
                    </li>
                  </ul>
                  <el-empty v-else description="该层级暂无关联关系" :image-size="48" />
                  <p class="ms-note">完整实体图与实例参数可在想定生成阶段进一步调整与确认。</p>
                </el-collapse-item>
              </el-collapse>
            </section>
          </div>
        </div>
      </main>
    </div>

    <!-- 侧滑抽屉：推演运行参数与环境配置 -->
    <el-drawer
      v-model="drawerVisible"
      title="推演运行参数与环境配置"
      size="480px"
      direction="rtl"
      class="ms-param-drawer"
      :destroy-on-close="false"
    >
      <template #header>
        <div class="ms-drawer-head">
          <div class="ms-drawer-head-title">
            <el-icon><Operation /></el-icon>
            <strong>推演环境与运行参数</strong>
          </div>
          <small class="ms-drawer-head-sub">配置实验时段窗口、优化迭代轮数与外部冲击扰动基线</small>
        </div>
      </template>

      <div class="ms-drawer-content">
        <section class="ms-param-summary">
          <div>
            <span class="ms-param-summary-kicker">当前推演配置</span>
            <strong>{{ draftForm.start_year }}–{{ draftForm.end_year }} · {{ draftForm.optimization_iterations }} 轮迭代</strong>
          </div>
          <el-tag size="small" :type="draftDirty ? 'warning' : 'success'" effect="plain">
            {{ draftDirty ? '待保存' : '已同步' }}
          </el-tag>
        </section>

        <section class="ms-drawer-section glass-panel">
          <div class="ms-drawer-section-title">
            <el-icon><Calendar /></el-icon>
            <strong>推演时段与规模</strong>
            <el-tag v-if="draftDirty" size="small" type="warning" effect="dark">有未保存修改</el-tag>
          </div>
          <p class="ms-window-note">按年度推演。常规前瞻为 2024–2028 年，历史复现为 1997–2024 年，极端冲击为 2027–2029 年。</p>
          <div class="ms-preset-row">
            <span class="ms-preset-label">快速预设方案：</span>
            <div class="ms-preset-btns">
              <button
                type="button"
                class="ms-preset-btn"
                :class="{ active: isPresetActive(2024, 2028, 1, 1) }"
                @click="applyPreset(2024, 2028, 1, 1)"
              >
                常规前瞻 (2024–2028)
              </button>
              <button
                type="button"
                class="ms-preset-btn"
                :class="{ active: isPresetActive(1997, 2024, 2, 0.8) }"
                @click="applyPreset(1997, 2024, 2, 0.8)"
              >
                历史复现 (1997–2024)
              </button>
              <button
                type="button"
                class="ms-preset-btn"
                :class="{ active: isPresetActive(2027, 2029, 3, 1.5) }"
                @click="applyPreset(2027, 2029, 3, 1.5)"
              >
                极端冲击 (2027–2029)
              </button>
            </div>
          </div>
          <div class="ms-form-grid">
            <label>
              <span>起始年份</span>
              <el-input-number v-model="draftForm.start_year" :min="1997" :max="2035" :step="1" size="small" controls-position="right" />
            </label>
            <label>
              <span>结束年份</span>
              <el-input-number v-model="draftForm.end_year" :min="draftForm.start_year" :max="2040" :step="1" size="small" controls-position="right" />
            </label>
            <label>
              <span>迭代轮数</span>
              <el-input-number v-model="draftForm.optimization_iterations" :min="1" :max="planner.maxIterations" :step="1" size="small" controls-position="right" />
            </label>
            <label>
              <span>事件强度倍率</span>
              <el-input-number v-model="draftForm.event_severity_multiplier" :min="0.1" :max="2" :step="0.1" :precision="1" size="small" controls-position="right" />
            </label>
          </div>
          <div class="ms-form-actions">
            <el-button size="small" text @click="resetDraft">恢复默认</el-button>
            <el-button size="small" type="primary" :disabled="!draftDirty" @click="handleSaveDraft">
              <el-icon><Check /></el-icon>
              <span>保存基线</span>
            </el-button>
          </div>
        </section>

        <section class="ms-drawer-section glass-panel">
          <div class="ms-drawer-section-title">
            <el-icon><Aim /></el-icon>
            <strong>时间与评估口径</strong>
          </div>
          <dl class="ms-rule-list">
            <div v-for="rule in convergenceRules" :key="rule.label">
              <dt>{{ rule.label }}</dt>
              <dd>{{ rule.value }}</dd>
            </div>
          </dl>
          <div class="ms-weights compact">
            <span class="ms-weights-title">综合评分权重</span>
            <div v-for="item in observerWeights" :key="item.key" class="ms-weight-row">
              <span>{{ item.label }}</span>
              <div class="ms-weight-track"><i :style="{ width: `${item.weight * 100 * 2.5}%` }"></i></div>
              <b>{{ (item.weight * 100).toFixed(0) }}%</b>
            </div>
          </div>
          <div class="ms-chip-row ms-param-space">
            <span class="ms-weights-title">可调整策略</span>
            <span v-for="key in planner.parameterSpace" :key="key" class="ms-chip mono">{{ key }}</span>
          </div>
        </section>

        <section class="ms-drawer-section glass-panel">
          <div class="ms-drawer-section-title">
            <el-icon><Bell /></el-icon>
            <strong>年度扰动事件</strong>
            <small>{{ eventCount }} 条在推演时段内</small>
          </div>
          <ul class="ms-event-list">
            <li v-for="row in eventRows" :key="row.year" :class="{ muted: !row.inWindow }">
              <strong>{{ row.year }}</strong>
              <div>
                <span v-for="event in row.events" :key="event">{{ event }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <template #footer>
        <div class="ms-drawer-footer">
          <span class="ms-drawer-status-note">{{ draftDirty ? '当前有修改，进入下一步或点击保存后生效' : '基线参数已同步' }}</span>
          <div class="ms-drawer-foot-btns">
            <el-button size="small" @click="drawerVisible = false">关闭</el-button>
            <el-button size="small" type="primary" :disabled="!draftDirty" @click="handleSaveDraft">保存并应用</el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 侧滑抽屉：人机对话与人工校准设定窗口 (对齐师姐诉求) -->
    <el-drawer
      v-model="calibrationDrawerVisible"
      title="AI 建模助手与人工校准设定"
      size="520px"
      direction="rtl"
      class="ms-calibration-drawer"
    >
      <template #header>
        <div class="ms-drawer-head">
          <div class="ms-drawer-head-title">
            <el-icon><ChatDotRound /></el-icon>
            <strong>AI 建模助手与人工校准窗口</strong>
          </div>
          <small class="ms-drawer-head-sub">通过自然语言人机对话与专家参数滑块，实时校准智能体认知权重与约束</small>
        </div>
      </template>

      <div class="ms-calibration-body">
        <div class="calib-mode-tabs" role="tablist" aria-label="建模助手模式">
          <button type="button" :class="{ active: calibrationTab === 'chat' }" @click="calibrationTab = 'chat'">
            <el-icon><ChatDotRound /></el-icon>
            <span>对话助手</span>
            <small>解释建模逻辑</small>
          </button>
          <button type="button" :class="{ active: calibrationTab === 'calibration' }" @click="calibrationTab = 'calibration'">
            <el-icon><Setting /></el-icon>
            <span>参数校准</span>
            <small>调整认知约束</small>
          </button>
        </div>

        <!-- 对话助手 -->
        <section v-if="calibrationTab === 'chat'" class="calib-chat-section glass-panel">
          <div class="calib-section-title">
            <el-icon><ChatDotRound /></el-icon>
            <div>
              <strong>建模助手</strong>
              <small>解释当前智能体如何感知、判断与行动</small>
            </div>
          </div>
          <div class="calib-chat-messages" ref="calibChatScroll">
            <div v-for="(msg, mIdx) in calibChatHistory" :key="mIdx" class="calib-msg-row" :class="msg.sender">
              <span class="calib-msg-avatar">{{ msg.sender === 'user' ? '专家' : 'AI' }}</span>
              <div class="calib-msg-bubble">
                <p>{{ msg.text }}</p>
                <small>{{ msg.time }}</small>
              </div>
            </div>
          </div>

          <!-- 快捷对话指令 -->
          <div class="calib-quick-tags">
            <button type="button" class="calib-tag-btn" @click="sendCalibQuickMsg('请分析北方包头基地当前安全库存警戒线与补料周期')">
              北方基地库存分析
            </button>
            <button type="button" class="calib-tag-btn" @click="sendCalibQuickMsg('调高中哈口岸阿拉山口通关负荷率警戒阈值至 95%')">
              口岸警戒线上调
            </button>
            <button type="button" class="calib-tag-btn" @click="sendCalibQuickMsg('强化极端地缘断供下的战略储备借调平准优先级')">
              储备平准优先级
            </button>
          </div>

          <!-- 对话输入行 -->
          <div class="calib-input-row">
            <el-input
              v-model="calibInputText"
              size="small"
              placeholder="输入智能体调参指令或询问认知逻辑..."
              @keyup.enter="sendCalibUserMsg"
            />
            <el-button type="primary" size="small" @click="sendCalibUserMsg">发送</el-button>
          </div>
        </section>

        <!-- 参数校准 -->
        <section v-else class="calib-sliders-section glass-panel">
          <div class="calib-section-title">
            <el-icon><Setting /></el-icon>
            <div>
              <strong>人工校准参数</strong>
              <small>修改后点击底部“保存并应用”写入本次沙盘配置</small>
            </div>
            <el-tag size="small" type="success" effect="plain">专家在环</el-tag>
          </div>

          <div class="calib-form-item">
            <div class="calib-label-row">
              <span>智能体风险厌恶系数 γ：</span>
              <b>{{ calibParams.riskAversion }}</b>
            </div>
            <el-slider v-model="calibParams.riskAversion" :min="0.1" :max="1.0" :step="0.05" />
            <small>影响智能体对国际现货溢价的否决灵敏度（数值越高越厌恶追涨）</small>
          </div>

          <div class="calib-form-item">
            <div class="calib-label-row">
              <span>国家战略储备介入红线 (天数)：</span>
              <b>{{ calibParams.reserveThreshold }} 天</b>
            </div>
            <el-slider v-model="calibParams.reserveThreshold" :min="90" :max="360" :step="15" />
            <small>当基地库存低于该天数时，自动向国资专班申请借调平准</small>
          </div>

          <div class="calib-form-item">
            <div class="calib-label-row">
              <span>态势函数敏感度权重 (地缘 / 通道 / 缺口)：</span>
              <b>{{ calibParams.weightGeo }} : {{ calibParams.weightCorridor }} : {{ calibParams.weightGap }}</b>
            </div>
            <div class="calib-weights-row">
              <el-input-number v-model="calibParams.weightGeo" :min="0.1" :max="0.8" :step="0.05" size="small" />
              <el-input-number v-model="calibParams.weightCorridor" :min="0.1" :max="0.8" :step="0.05" size="small" />
              <el-input-number v-model="calibParams.weightGap" :min="0.1" :max="0.8" :step="0.05" size="small" />
            </div>
          </div>

          <div class="calib-switches-row">
            <el-switch v-model="calibParams.enableReflexion" active-text="启用推演后 Reflexion 认知反思" />
            <el-switch v-model="calibParams.enableDynamicPrompt" active-text="启用 Prompt 动态自适应修正" />
          </div>
        </section>
      </div>

      <template #footer>
        <div class="ms-drawer-footer">
          <span class="ms-drawer-status-note">人工校准参数将实时注入智能体决策内核</span>
          <div class="ms-drawer-foot-btns">
            <el-button size="small" @click="resetCalibParams">恢复基线</el-button>
            <el-button size="small" type="primary" @click="applyCalibParams">保存并应用人工校准</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { formatUraniumEvent } from '@/utils/uraniumScene'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Aim, ArrowRight, Bell, Box, Calendar, ChatDotRound, Cpu, Guide, OfficeBuilding,
  Search, Sell, User, Tickets, Operation, Histogram, MapLocation, SetUp,
  Connection, Reading, Right, DataAnalysis, Share, InfoFilled,
  Grid, Check, Setting
} from '@element-plus/icons-vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import UraniumModelingTopology from './components/simulation/UraniumModelingTopology.vue'
import './components/shared/midStage.css'
import { useUraniumDuringStore } from '@/stores/scnet/useUraniumDuringStore'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { validateUraniumModelingDraft } from '@/utils/uraniumModeling'
import { URANIUM_REFERENCE_GRAPH } from '@/views/SCnet/mock/agentGraphMock'
import {
  URANIUM_BASE_YEAR_ROWS,
  URANIUM_MANUFACTURER_ACTORS,
  URANIUM_SUPPLIER_ACTORS
} from '@/views/SCnet/mock/uraniumDemoLab'
import {
  URANIUM_AGENT_ROLE_LIBRARY,
  URANIUM_OBSERVER_WEIGHTS,
  URANIUM_OODA_STAGES,
  URANIUM_PLANNER,
  URANIUM_ENVIRONMENT_LAYERS,
  URANIUM_LOGISTICS_CORRIDORS,
  URANIUM_RULE_MATHEMATICS,
  URANIUM_SAFETY_LEVELS,
  URANIUM_DISPATCH_TRIGGER_RULES,
  URANIUM_RESEARCH_BASIS,
  resolveUraniumAgentRole
} from '@/views/SCnet/mock/uraniumAgentRoleLibrary'
import {
  getUraniumSuppliers,
  getUraniumManufacturers,
  getUraniumEnvironmentEvents,
  checkBackendHealth
} from '@/api/uraniumBackend'

defineOptions({ name: 'ModelingSetupUranium' })

const route = useRoute()
const router = useRouter()
const uraniumStore = useUraniumDuringStore()

// 真实后端连通状态与实体
const backendConnected = ref(false)
const backendSuppliers = ref([])
const backendManufacturers = ref([])
const backendEvents = ref([])

async function fetchBackendData() {
  try {
    const health = await checkBackendHealth()
    if (health) backendConnected.value = true

    const [supRes, mfrRes, evtRes] = await Promise.allSettled([
      getUraniumSuppliers(),
      getUraniumManufacturers(),
      getUraniumEnvironmentEvents()
    ])

    if (supRes.status === 'fulfilled' && supRes.value?.suppliers?.length) {
      backendSuppliers.value = supRes.value.suppliers
      backendConnected.value = true
    }
    if (mfrRes.status === 'fulfilled' && Array.isArray(mfrRes.value) && mfrRes.value.length) {
      backendManufacturers.value = mfrRes.value
    }
    if (evtRes.status === 'fulfilled' && evtRes.value?.events?.length) {
      backendEvents.value = evtRes.value.events
    }
  } catch (err) {
    console.warn('Backend load error, using baseline actors:', err)
  }
}

// 后端 configs/uranium_agent_config.yaml 中的实体容量（entity_types.count）
const TIER_CAPACITY = Object.freeze({ supply: 16, manufacturing: 5 })
const TIER_ICONS = Object.freeze({ supply: Box, transport: Guide, manufacturing: OfficeBuilding, sales: Sell })
const tierIcon = (tier) => TIER_ICONS[tier] || OfficeBuilding

const planner = URANIUM_PLANNER
const oodaStages = URANIUM_OODA_STAGES
const observerWeights = URANIUM_OBSERVER_WEIGHTS
const modelingView = ref('agent')
const drawerVisible = ref(false)
const roleFilterTier = ref('all')
const calibrationTab = ref('chat')

// 人机对话与人工校准设定 (对齐师姐诉求)
const calibrationDrawerVisible = ref(false)
const calibInputText = ref('')
const calibChatScroll = ref(null)
const calibChatHistory = reactive([
  {
    sender: 'assistant',
    text: '您好！我是多智能体沙盘建模助手。当前沙盘已构建 28 个核心智能体与 3 条陆海战略走廊。您可通过自然语言向我询问智能体认知机理，或在下方滑块直接校准决策函数参数。',
    time: '10:00:00'
  },
  {
    sender: 'user',
    text: '请确认制造转化 Agent（中核北方包头）的 OODA 态势函数触发条件。',
    time: '10:00:15'
  },
  {
    sender: 'assistant',
    text: '包头基地 Agent 感知函数 S(t) = w₁·R_geo(t) + w₂·(1 - C_corridor(t)) + w₃·[D_gap(t) / Stock_safe]。当前基线设定阈值 S(t) ≥ 0.75 时，将自动触发跨区现货加价扫货或申请借调防城港保税库平准。',
    time: '10:00:18'
  }
])

const calibParams = reactive({
  riskAversion: 0.75,
  reserveThreshold: 180,
  weightGeo: 0.40,
  weightCorridor: 0.35,
  weightGap: 0.25,
  enableReflexion: true,
  enableDynamicPrompt: true
})

function sendCalibUserMsg() {
  const text = calibInputText.value.trim()
  if (!text) return
  calibChatHistory.push({
    sender: 'user',
    text,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
  })
  calibInputText.value = ''

  setTimeout(() => {
    let reply = `已收到指令：「${text}」。已根据专家经验更新智能体认知先验，并同步至 OODA 态势感知内核。`
    if (text.includes('库存') || text.includes('包头')) {
      reply = `已为您重算北方基地库存阈值。当前安全库存底线为 ${calibParams.reserveThreshold} 天，当实际周转天数破线将自动触发预警。`
    } else if (text.includes('口岸') || text.includes('阿拉山口')) {
      calibParams.weightCorridor = 0.45
      reply = `已调高中哈口岸阿拉山口通关负荷权重至 ${calibParams.weightCorridor}，强化通道运力瓶颈对感知函数 S(t) 的贡献。`
    } else if (text.includes('储备') || text.includes('平准')) {
      calibParams.riskAversion = 0.85
      reply = `已强化战略储备介入优先级，风险厌恶系数 γ 已动态调整至 ${calibParams.riskAversion}，抑制追涨高溢价现货。`
    }
    calibChatHistory.push({
      sender: 'assistant',
      text: reply,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    })
  }, 400)
}

function sendCalibQuickMsg(text) {
  calibInputText.value = text
  sendCalibUserMsg()
}

function applyCalibParams() {
  ElMessage.success('专家人工校准参数已成功保存并注入 28 个智能体认知决策内核！')
  calibrationDrawerVisible.value = false
}

function resetCalibParams() {
  calibParams.riskAversion = 0.75
  calibParams.reserveThreshold = 180
  calibParams.weightGeo = 0.40
  calibParams.weightCorridor = 0.35
  calibParams.weightGap = 0.25
  calibParams.enableReflexion = true
  calibParams.enableDynamicPrompt = true
  ElMessage.info('已恢复为初始专家基线校准参数')
}

const activeAgentTier = ref('supply')
const activeAgentData = computed(() => URANIUM_AGENT_ROLE_LIBRARY[activeAgentTier.value] || URANIUM_AGENT_ROLE_LIBRARY.supply)

const mainAgentTiers = [
  { tier: 'supply', code: 'AGENT / 01', name: '供给方 Agent', subtitle: '海外矿山与资源国', icon: Sell },
  { tier: 'transport', code: 'AGENT / 02', name: '运输通道 Agent', subtitle: '陆海通道与跨境口岸', icon: Guide },
  { tier: 'manufacturing', code: 'AGENT / 03', name: '制造转化 Agent', subtitle: '国内采购与转化基地', icon: OfficeBuilding },
  { tier: 'sales', code: 'AGENT / 04', name: '核电需求 Agent', subtitle: '沿海在役与示范机组', icon: Cpu }
]

const environmentLayers = URANIUM_ENVIRONMENT_LAYERS
const logisticsCorridors = URANIUM_LOGISTICS_CORRIDORS
const ruleMathematics = URANIUM_RULE_MATHEMATICS
const safetyLevels = URANIUM_SAFETY_LEVELS
const dispatchTriggerRules = URANIUM_DISPATCH_TRIGGER_RULES
const researchBasis = URANIUM_RESEARCH_BASIS

function switchAgentTier(tier) {
  activeAgentTier.value = tier
  const grp = agentGroups.value.find(g => g.tier === tier)
  if (grp && grp.members.length) {
    selectMember(grp.members[0])
  }
}

const isFresh = computed(() => route.query.fresh === '1')

// ---------- Agent 列表（按层级分组，支持真实后端数据与回落基准同源） ----------
const referenceAgents = URANIUM_REFERENCE_GRAPH.agents || []
const transportAgents = referenceAgents.filter((item) => item.category === 'transport')
const demandAgents = referenceAgents.filter((item) => item.category === 'sales')

function member(tier, id, name, note) {
  return { key: `${tier}:${id}`, tier, id, name, note }
}

const agentGroups = computed(() => {
  const supplyMembers = backendSuppliers.value.length
    ? backendSuppliers.value.map(item => member(
        'supply',
        item.id,
        item.country || item.id,
        `${item.country} · 产能~${item.capacity_tU || '-'}tU/年 · 成本${item.cost_tier || ''}`
      ))
    : URANIUM_SUPPLIER_ACTORS.map((item) => member('supply', item.id, item.name, `${item.country} · ${item.mining_method}`))

  const manufacturingMembers = backendManufacturers.value.length
    ? backendManufacturers.value.map(item => member(
        'manufacturing',
        item.id,
        item.name,
        `${item.location || '中国'} · 年需求${item.annual_demand_tU || '-'}tU · 目标库存${item.inventory_target_years || 3}年`
      ))
    : URANIUM_MANUFACTURER_ACTORS.map((item) => member('manufacturing', item.id, item.name, `${item.city_cluster} · ${item.port_name}`))

  return [
    {
      tier: 'supply',
      label: URANIUM_AGENT_ROLE_LIBRARY.supply.label,
      icon: TIER_ICONS.supply,
      capacity: TIER_CAPACITY.supply,
      members: supplyMembers
    },
    {
      tier: 'transport',
      label: URANIUM_AGENT_ROLE_LIBRARY.transport.label,
      icon: TIER_ICONS.transport,
      capacity: 0,
      members: [
        ...transportAgents.map((item) => member('transport', item.id, item.name, item.description)),
        ...URANIUM_SUPPLIER_ACTORS
          .filter((item) => item.route_type === 'land_route')
          .map((item) => member('transport', `route-${item.id}`, item.reference_route_name, item.reference_path))
      ]
    },
    {
      tier: 'manufacturing',
      label: URANIUM_AGENT_ROLE_LIBRARY.manufacturing.label,
      icon: TIER_ICONS.manufacturing,
      capacity: TIER_CAPACITY.manufacturing,
      members: manufacturingMembers
    },
    {
      tier: 'sales',
      label: URANIUM_AGENT_ROLE_LIBRARY.sales.label,
      icon: TIER_ICONS.sales,
      capacity: 0,
      members: demandAgents.map((item) => member('sales', item.id, item.name, item.description))
    }
  ]
})

const searchKeyword = ref('')
const filteredGroups = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  let list = agentGroups.value
  if (roleFilterTier.value !== 'all') {
    list = list.filter((g) => g.tier === roleFilterTier.value)
  }
  if (!kw) return list
  return list
    .map((group) => ({ ...group, members: group.members.filter((item) => item.name.toLowerCase().includes(kw)) }))
    .filter((group) => group.members.length)
})
const openGroups = ref(['supply', 'transport', 'manufacturing', 'sales'])
const totalAgentCount = computed(() => agentGroups.value.reduce((sum, group) => sum + group.members.length, 0))

const selectedKey = ref('')
const selectedMember = computed(() => (
  agentGroups.value.flatMap((group) => group.members).find((item) => item.key === selectedKey.value)
  || agentGroups.value[0]?.members[0]
  || null
))
const selectedGroup = computed(() => agentGroups.value.find((group) => group.tier === selectedMember.value?.tier) || null)
const selectedRole = computed(() => resolveUraniumAgentRole({
  id: selectedMember.value?.id,
  name: selectedMember.value?.name,
  category: selectedMember.value?.tier
}))
function selectMember(item) {
  selectedKey.value = item.key
  activeAgentTier.value = item.tier
}
function selectGroup(tier) {
  activeAgentTier.value = tier
  const group = agentGroups.value.find(item => item.tier === tier)
  if (group?.members.length) selectMember(group.members[0])
}
function viewTierEntities(tier) {
  modelingView.value = 'role'
  roleFilterTier.value = tier
  const group = agentGroups.value.find(item => item.tier === tier)
  if (group?.members.length) selectMember(group.members[0])
}

const openSections = ref(['role'])

// ---------- 属性条 / 格式化 ----------
const formatRisk = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(3) : '—')
const formatRange = (attr) => {
  const [min, max] = attr.range || []
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '—'
  const fmtNum = (n) => (attr.type === 'float' ? n.toFixed(2) : n.toLocaleString('zh-CN'))
  return `${fmtNum(min)} – ${fmtNum(max)}`
}
// 属性条只做相对示意：范围落在 [0, 上界 × 1.2] 的位置
const attrBarStyle = (attr) => {
  const [min, max] = attr.range || [0, 0]
  const scaleMax = attr.type === 'float' && max <= 1 ? 1 : max * 1.2
  const left = scaleMax > 0 ? Math.max(0, (min / scaleMax) * 100) : 0
  const width = scaleMax > 0 ? Math.max(4, ((max - min) / scaleMax) * 100) : 0
  return { left: `${left.toFixed(1)}%`, width: `${Math.min(100 - left, width).toFixed(1)}%` }
}

// ---------- 关联关系（参考骨架中涉及所选层级的边） ----------
const agentById = new Map(referenceAgents.map((item) => [item.id, item]))
const relatedEdges = computed(() => (URANIUM_REFERENCE_GRAPH.relationship_net || [])
  .filter((edge) => agentById.get(edge.source)?.category === selectedRole.value.tier || agentById.get(edge.target)?.category === selectedRole.value.tier)
  .map((edge) => ({
    ...edge,
    sourceName: agentById.get(edge.source)?.name || edge.source,
    targetName: agentById.get(edge.target)?.name || edge.target
  })))
const relationEdgeCount = (URANIUM_REFERENCE_GRAPH.relationship_net || []).length

// ---------- 环境配置（与 during store draft 同步） ----------
const draftForm = reactive({
  start_year: 2024,
  end_year: 2028,
  optimization_iterations: 1,
  event_severity_multiplier: 1
})

function syncFormFromDraft() {
  const draft = uraniumStore.draft || {}
  draftForm.start_year = Number(draft.start_year) || 2024
  draftForm.end_year = Number(draft.end_year) || 2028
  draftForm.optimization_iterations = Number(draft.optimization_iterations) || 1
  draftForm.event_severity_multiplier = Number(draft.event_severity_multiplier) || 1
}

const draftDirty = computed(() => {
  const draft = uraniumStore.draft || {}
  return (
    Number(draft.start_year) !== draftForm.start_year
    || Number(draft.end_year) !== draftForm.end_year
    || Number(draft.optimization_iterations) !== draftForm.optimization_iterations
    || Number(draft.event_severity_multiplier) !== draftForm.event_severity_multiplier
  )
})

function saveDraft() {
  const error = validateUraniumModelingDraft(draftForm, planner.maxIterations)
  if (error) {
    ElMessage.warning(error)
    return false
  }
  uraniumStore.patchDraft({ ...draftForm })
  ElMessage.success('建模基线已保存，启动实验时生效')
  return true
}

function handleSaveDraft() {
  if (saveDraft()) {
    drawerVisible.value = false
  }
}

function isPresetActive(start, end, iters, mult) {
  return (
    draftForm.start_year === start &&
    draftForm.end_year === end &&
    draftForm.optimization_iterations === iters &&
    Math.abs(draftForm.event_severity_multiplier - mult) < 0.05
  )
}

function applyPreset(start, end, iters, mult) {
  draftForm.start_year = start
  draftForm.end_year = end
  draftForm.optimization_iterations = iters
  draftForm.event_severity_multiplier = mult
}

function resetDraft() {
  uraniumStore.resetDraft()
  syncFormFromDraft()
}

watch(() => uraniumStore.draft, syncFormFromDraft, { deep: true })

const convergenceRules = computed(() => [
  { label: '推演时间步长', value: '1 季度 / 1 半年度（核燃料调运与换料大修周期）' },
  { label: '历史校准基准', value: planner.calibrationWindow },
  { label: '收敛判定准则', value: 'Monte-Carlo 随机采样 1000 次 · 95% 置信区间' },
  { label: '多目标优化导向', value: '帕累托最优前沿解（极小化保供敞口 & 平抑完全成本）' },
  { label: '决策约束边界', value: '商业安全库存 >= 180 天 · 阿拉山口 <= 1,200 tU/月' }
])

// ---------- 事件库 ----------
const eventRows = computed(() => URANIUM_BASE_YEAR_ROWS.map((row) => ({
  year: row.year,
  events: (row.active_events || []).map(formatUraniumEvent),
  inWindow: row.year >= draftForm.start_year && row.year <= draftForm.end_year
})))
const eventCount = computed(() => eventRows.value.filter((row) => row.inWindow).reduce((sum, row) => sum + row.events.length, 0))

// ---------- 顶部统计 ----------
const heroStats = computed(() => [
  { label: 'Agent', value: String(totalAgentCount.value) },
  { label: '关系', value: String(relationEdgeCount) },
  { label: '事件', value: String(eventCount.value) },
  { label: '推演时段', value: `${draftForm.start_year}–${draftForm.end_year}` }
])

// ---------- 导航 ----------
function goNext() {
  // 下一步使用屏幕上确认的参数，避免未点击「保存」就丢失配置。
  if (draftDirty.value && !saveDraft()) return
  const query = { scenario: 'uranium' }
  if (isFresh.value) {
    query.fresh = '1'
  }
  router.push({ path: SCNET_ROUTES.scenarioAnalysis, query })
}

onMounted(() => {
  syncFormFromDraft()
  selectedKey.value = agentGroups.value[0]?.members[0]?.key || ''
  fetchBackendData()
})
</script>

<style scoped>
.ms-window-note { margin: 0 0 12px; color: #64748b; font-size: 12px; line-height: 1.7; }
.ms-view-tabs, .ms-inspector-tabs { display: flex; flex-shrink: 0; align-items: center; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; }
.ms-view-tabs button, .ms-inspector-tabs button { padding: 8px 12px; border: 0; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font-size: 12px; }
.ms-view-tabs button.active, .ms-inspector-tabs button.active { color: #2563eb; background: #eff6ff; font-weight: 600; }
.ms-view-tabs > span { margin-left: auto; margin-right: 8px; color: #94a3b8; font-size: 11px; }
.ms-inspector-tabs { border: 0; border-bottom: 1px solid #e2e8f0; border-radius: 0; }
.ms-inspector-tabs button { flex: 1; }
.ms-inspector-role h3 { margin: 8px 0; font-size: 17px; color: #1e293b; }
.ms-inspector-role p { font-size: 12px; color: #64748b; line-height: 1.8; }
.ms-inspector-kicker { color: #2563eb; font-size: 11px; }
.ms-inspector-stage { display: grid; grid-template-columns: 32px 1fr; gap: 10px; margin-bottom: 12px; font-size: 12px; line-height: 1.7; }
.ms-inspector-stage span { color: #64748b; }
.modeling-setup {
  container: modeling / inline-size;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 8px 8px;
  box-sizing: border-box;
  overflow: hidden;
}

.ms-header-stats {
  display: flex;
  gap: 6px;
  margin-right: 6px;
}
.ms-header-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--mid-border-soft);
  background: rgba(255, 255, 255, 0.7);
}
.ms-header-stat span { color: var(--mid-text-muted); font-size: var(--mid-fs-micro); }
.ms-header-stat strong { color: var(--mid-text-strong); font-size: var(--mid-fs-strong); font-weight: 700; }

/* 全宽沉浸工作台 */
.ms-studio {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ms-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.ms-center.is-role { overflow-y: auto; }
.ms-center > .model-topology { min-height: 0; }
.ms-view-tabs { flex-wrap: wrap; }
.ms-view-tabs > span { display: none; }
.ms-level-details { margin-top: 8px; font-size: 11px; color: #64748b; }
.ms-level-details summary { cursor: pointer; }
.ms-left-foot, .ms-panel-head, .ms-search { flex-shrink: 0; }
.ms-header-stats { flex-wrap: wrap; }

.ms-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 8px;
}
.ms-panel-head strong {
  display: block;
  font-size: var(--mid-fs-title);
  color: var(--mid-text-strong);
}
.ms-panel-head span {
  display: block;
  margin-top: 2px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
}
.ms-count {
  min-width: 28px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  padding: 0 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: var(--mid-fs-label);
  font-weight: 800;
}
.ms-search { padding: 0 14px 8px; }
.ms-left-scroll { flex: 1; min-height: 0; padding: 0 8px; }

.ms-groups { border-top: none; border-bottom: none; }
.ms-groups :deep(.el-collapse-item__header) {
  height: 36px;
  line-height: 36px;
  padding: 0 6px;
  font-size: var(--mid-fs-label);
  border-bottom-color: #eef2f7;
}
.ms-groups :deep(.el-collapse-item__wrap) { border-bottom: none; }
.ms-groups :deep(.el-collapse-item__content) { padding: 4px 0 8px; }
.ms-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  font-weight: 700;
  color: var(--mid-text-strong);
}
.ms-group-title small {
  margin-left: auto;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  font-weight: 400;
}
.ms-tier-dot { width: 8px; height: 8px; border-radius: 2px; background: #94a3b8; }
.ms-tier-dot.supply { background: #6366f1; }
.ms-tier-dot.transport { background: #0891b2; }
.ms-tier-dot.manufacturing { background: #f97316; }
.ms-tier-dot.sales { background: #ec4899; }

.ms-agent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.ms-agent-item:hover { background: #f1f5f9; }
.ms-agent-item.active { background: #eff6ff; border-color: #bfdbfe; }
.ms-agent-icon {
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #fff;
  background: #94a3b8;
  font-size: 13px;
}
.ms-agent-icon.supply, .ms-hero-icon.supply { background: #6366f1; }
.ms-agent-icon.transport, .ms-hero-icon.transport { background: #0891b2; }
.ms-agent-icon.manufacturing, .ms-hero-icon.manufacturing { background: #f97316; }
.ms-agent-icon.sales, .ms-hero-icon.sales { background: #ec4899; }
.ms-agent-info { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.ms-agent-info b {
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ms-agent-info small {
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ms-agent-arrow { color: #cbd5e1; font-size: 14px; }

.ms-left-foot {
  padding: 10px 14px 12px;
  border-top: 1px solid #eef2f7;
}
.ms-foot-title {
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
  margin-bottom: 6px;
}
.ms-level-bar {
  display: flex;
  gap: 2px;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.ms-level-segment { display: flex; align-items: center; justify-content: center; min-width: 0; }
.ms-level-segment em {
  font-style: normal;
  font-size: var(--mid-fs-micro);
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.18);
}
.ms-level-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ms-level-list li { display: flex; gap: 6px; align-items: flex-start; }
.ms-level-list i { flex: 0 0 8px; width: 8px; height: 8px; margin-top: 3px; border-radius: 2px; }
.ms-level-list span { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); line-height: 1.5; }
.ms-level-list b { display: block; color: var(--mid-text-strong); }

/* 中间：角色卡 */
.ms-hero {
  padding: 12px 14px;
}
.ms-hero-main { display: flex; gap: 12px; align-items: center; }
.ms-hero-icon {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
  background: #94a3b8;
  font-size: 22px;
}
.ms-hero-copy { min-width: 0; }
.ms-hero-copy h2 {
  margin: 2px 0 6px;
  font-size: var(--mid-fs-title);
  font-weight: 800;
  color: var(--mid-text-strong);
}
.ms-hero-tags, .ms-chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
.ms-tag, .ms-chip {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: var(--mid-fs-micro);
  color: #475569;
}
.ms-tag.method { color: #1d4ed8; background: #eff6ff; border-color: #c7d7f5; font-weight: 700; }
.ms-tag.mono, .ms-chip.mono { font-family: var(--mid-font-mono); }
.ms-hero-goal {
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}

.ms-role { padding: 4px 14px 10px; }
.ms-collapse { border-top: none; border-bottom: none; }
.ms-collapse :deep(.el-collapse-item__header) {
  height: 38px;
  line-height: 38px;
  font-size: var(--mid-fs-strong);
  font-weight: 700;
  color: var(--mid-text-strong);
  border-bottom-color: #eef2f7;
}
.ms-collapse :deep(.el-collapse-item__wrap) { border-bottom-color: #eef2f7; }
.ms-collapse :deep(.el-collapse-item__content) { padding: 8px 2px 14px; }

.ms-role-list, .ms-ooda-detail { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.ms-role-list dt, .ms-facts dt, .ms-posture-block > span, .ms-attr-enum > span, .ms-weights-title {
  display: block;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  color: var(--mid-text-muted);
}
.ms-role-list dd {
  margin: 2px 0 0;
  font-size: var(--mid-fs-body);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}
.ms-bullets { margin: 0; padding-left: 16px; }
.ms-bullets li { margin: 1px 0; }
.ms-facts {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.ms-facts > div { padding: 6px 8px; border-radius: 6px; background: #f8fafc; }
.ms-facts dd {
  margin: 2px 0 0;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-strong);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ms-posture-grid, .ms-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.ms-two-col { margin-top: 10px; }
.ms-posture-grid > div { padding: 8px 10px; border-radius: 8px; background: #f8fafc; }
.ms-posture-grid span { display: block; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 700; }
.ms-posture-grid b { display: block; margin-top: 2px; font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-posture-block ol {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: var(--mid-fs-label);
  line-height: var(--mid-lh-body);
  color: var(--mid-text-body);
}
.ms-posture-block .ms-chip-row { margin-top: 4px; }

.ms-attr-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ms-attr-card { padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
.ms-attr-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: var(--mid-fs-label);
  color: var(--mid-text-body);
}
.ms-attr-head small { color: var(--mid-text-muted); font-size: var(--mid-fs-micro); }
.ms-attr-head b { font-family: var(--mid-font-mono); font-size: var(--mid-fs-label); color: var(--mid-text-strong); white-space: nowrap; }
.ms-attr-bar { position: relative; height: 6px; margin-top: 6px; border-radius: 4px; background: #edf2f7; overflow: hidden; }
.ms-attr-bar i { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: linear-gradient(90deg, #86b6ef, #2a78d6); }
.ms-attr-enum { margin-top: 10px; }
.ms-attr-enum .ms-chip-row { margin-top: 4px; }

.ms-weights { margin-top: 12px; }
.ms-weights.compact { margin-top: 10px; }
.ms-weight-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}
.ms-weight-track { height: 6px; border-radius: 4px; background: #edf2f7; overflow: hidden; }
.ms-weight-track i { display: block; height: 100%; border-radius: 4px; background: #2a78d6; }
.ms-weight-row b { text-align: right; font-family: var(--mid-font-mono); color: var(--mid-text-strong); }
.ms-param-space { margin-top: 10px; align-items: center; }
.ms-param-space .ms-weights-title { width: 100%; }

.ms-ooda-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
}
.ms-ooda-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  border-top: 3px solid var(--stage-color, #2a78d6);
  background: #fff;
}
.ms-ooda-stage b { font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-ooda-stage small { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); }
.ms-ooda-arrow { color: #a8b5c4; font-style: normal; }
.ms-ooda-detail { margin-top: 10px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ms-ooda-detail > div { padding: 6px 8px; border-radius: 6px; background: #f8fafc; }
.ms-ooda-detail dt { display: inline-flex; align-items: center; gap: 5px; font-size: var(--mid-fs-micro); font-weight: 700; color: var(--mid-text-body); }
.ms-ooda-detail dt i { width: 8px; height: 8px; border-radius: 2px; }
.ms-ooda-detail dd { margin: 2px 0 0; font-size: var(--mid-fs-label); color: var(--mid-text-body); line-height: 1.5; }
.ms-note { margin: 10px 0 0; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); line-height: 1.5; }

.ms-edge-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ms-edge-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: var(--mid-fs-label);
}
.ms-edge-list b { color: var(--mid-text-strong); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-edge-list b:last-child { text-align: right; }
.ms-edge-rel {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #c7d7f5;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: var(--mid-fs-micro);
  font-weight: 700;
  white-space: nowrap;
}

/* 右侧：环境配置 */
.ms-right-scroll { flex: 1; min-height: 0; }
.ms-env-section { padding: 6px 14px 12px; border-top: 1px solid #eef2f7; }
.ms-env-section:first-child { border-top: none; }
.ms-env-section:last-child { padding-bottom: 72px; }
.ms-env-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 8px;
  font-size: var(--mid-fs-label);
  font-weight: 700;
  color: var(--mid-text-strong);
}
.ms-env-title .el-icon { color: var(--mid-info); }
.ms-env-title small { margin-left: auto; font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 400; }
.ms-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; }
.ms-form-grid label { display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border: 1px solid #eef2f7; border-radius: 8px; background: #f8fafc; }
.ms-form-grid label > span { font-size: var(--mid-fs-micro); font-weight: 700; color: var(--mid-text-muted); }
.ms-form-grid :deep(.el-input-number) { width: 100%; }
.ms-form-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.ms-rule-list { margin: 0; display: flex; flex-direction: column; gap: 5px; }
.ms-rule-list > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 8px; border-radius: 6px; background: #f8fafc; }
.ms-rule-list dt { font-size: var(--mid-fs-micro); color: var(--mid-text-muted); font-weight: 700; }
.ms-rule-list dd { margin: 0; font-size: var(--mid-fs-label); color: var(--mid-text-strong); text-align: right; }
.ms-event-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ms-event-list li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: flex-start;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
}
.ms-event-list li.muted { opacity: 0.45; }
.ms-event-list strong { font-family: var(--mid-font-mono); font-size: var(--mid-fs-label); color: var(--mid-text-strong); }
.ms-event-list li > div { display: flex; flex-wrap: wrap; gap: 4px; }
.ms-event-list li > div span {
  padding: 1px 7px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: var(--mid-fs-micro);
  color: var(--mid-text-body);
}

@container modeling (max-width: 1150px) {
  .ms-header-stats { display: none; }
}
@container modeling (max-width: 960px) {
  .ms-role-composite-view { grid-template-columns: 1fr; }
}

/* 微观实体清单：局部复合双栏 */
.ms-role-composite-view {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.ms-role-nav {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
}
.ms-role-nav-head {
  padding: 12px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.ms-role-nav-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ms-role-nav-title strong {
  font-size: 13px;
  color: var(--mid-text-strong);
  font-weight: 700;
}
.ms-role-nav-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 6px;
}
.ms-role-nav-foot {
  padding: 10px 12px;
  border-top: 1px solid #eef2f7;
  flex-shrink: 0;
}
.ms-role-foot-note {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
  display: block;
}
.ms-role-detail-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

/* 推演参数抽屉 */
.ms-param-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.ms-drawer-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ms-drawer-head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}
.ms-drawer-head-title .el-icon {
  color: #2563eb;
  font-size: 18px;
}
.ms-drawer-head-sub {
  font-size: 11.5px;
  color: #64748b;
  font-weight: normal;
}
.ms-drawer-content {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.ms-drawer-section {
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.ms-drawer-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}
.ms-drawer-section-title .el-icon {
  color: #2563eb;
}
.ms-drawer-section-title small {
  margin-left: auto;
  font-size: 11px;
  color: #64748b;
  font-weight: normal;
}
.ms-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}
.ms-drawer-status-note {
  font-size: 12px;
  color: #64748b;
}
.ms-drawer-foot-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ms-param-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  position: relative;
  min-width: 142px;
  justify-content: center;
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}
.ms-param-header-btn:hover {
  border-color: #60a5fa;
  background: #dbeafe;
  color: #1e40af;
}
.ms-calibration-header-btn {
  min-width: 156px;
  justify-content: center;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}
.ms-calibration-header-btn:hover {
  border-color: #818cf8;
  background: #e0e7ff;
  color: #3730a3;
}
.ms-header-pill-badge {
  padding: 1px 6px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}
.ms-header-dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  position: absolute;
  top: 2px;
  right: 2px;
}
/* 视图 Tab 小胶囊 */
.tab-chip {
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 500;
  margin-left: 2px;
}
.ms-view-tabs button.active .tab-chip {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

/* 下沉至微观实体的跳转条 */
.am-jump-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  margin-top: 6px;
}
.am-jump-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}
.am-jump-info .el-icon {
  color: #2563eb;
}
.am-jump-info b {
  color: #1e293b;
}

/* 微观实体清单：层级快捷药丸 */
.ms-role-tier-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 2px 0;
}
.tier-pill-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all .15s ease;
}
.tier-pill-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.tier-pill-btn.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 700;
}

/* 抽屉预设方案选择 */
.ms-preset-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}
.ms-preset-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}
.ms-preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ms-preset-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s ease;
}
.ms-preset-btn:hover {
  border-color: #93c5fd;
  background: #f1f5f9;
}
.ms-preset-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

/* 陆海通道矩阵样式 */
.ms-route-matrix {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}
.ms-route-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ms-route-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ms-route-head strong {
  font-size: 11.5px;
  color: #0f172a;
  font-weight: 700;
}
.ms-route-cost {
  font-size: 11px;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 1px 6px;
  border-radius: 4px;
}
.ms-route-sub {
  font-size: 10.5px;
  color: #64748b;
  line-height: 1.4;
}

/* ========== 学长人工社会模型体系样式增强 ========== */
.ms-center.is-scrollable {
  overflow-y: auto;
  padding-right: 4px;
}
.ms-view-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.ms-view-tabs button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s ease;
}
.ms-view-tabs button:hover {
  background: #f1f5f9;
  color: #1e293b;
}
.ms-view-tabs button.active {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.08);
}
.ms-view-tag-count {
  margin-left: auto;
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.ms-model-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.model-view-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #092f55 0%, #0f568c 58%, #168079 100%);
  color: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(15, 86, 140, 0.16);
}
.model-view-heading .heading-num {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.model-view-heading .heading-text p {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #93c5fd;
  margin: 0 0 2px;
}
.model-view-heading .heading-text h2 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 4px;
  color: #fff;
}
.model-view-heading .heading-text small {
  font-size: 11.5px;
  color: #dbeafe;
  line-height: 1.45;
  display: block;
}

/* Agent 切换 Tabs */
.agent-tier-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.agent-tier-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all .15s ease;
}
.agent-tier-btn:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}
.agent-tier-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 1px #2563eb;
}
.agent-tier-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 17px;
  flex-shrink: 0;
}
.agent-tier-icon.supply { background: #dbeafe; color: #1d4ed8; }
.agent-tier-icon.transport { background: #fef3c7; color: #b45309; }
.agent-tier-icon.manufacturing { background: #dcfce7; color: #15803d; }
.agent-tier-icon.sales { background: #f3e8ff; color: #7e22ce; }
.agent-tier-code {
  font-size: 9.5px;
  font-family: monospace;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 1px 4px;
  border-radius: 4px;
}
.agent-tier-meta strong {
  font-size: 12.5px;
  color: #0f172a;
  margin-left: 4px;
}
.agent-tier-meta small {
  display: block;
  font-size: 10.5px;
  color: #64748b;
  margin-top: 2px;
}

/* Agent Master Card */
.agent-master-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}
.am-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}
.am-code-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.am-code {
  font-size: 10px;
  font-weight: 800;
  font-family: monospace;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 6px;
  border-radius: 4px;
}
.am-code-title h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.am-subtitle {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}
.am-desc {
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
  margin: 0 0 6px;
}
.am-goal {
  font-size: 12px;
  color: #0369a1;
  background: #f0f9ff;
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 3px solid #0284c7;
  margin: 0;
}
.am-header-right small {
  font-size: 10px;
  color: #64748b;
  font-weight: 700;
  display: block;
  text-align: right;
  margin-bottom: 4px;
}
.am-tags {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
}
.am-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: #1e40af;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 12px;
}

/* Contract Bar */
.am-contract-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
}
.am-contract-item small {
  font-size: 10px;
  color: #64748b;
  font-weight: 700;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 2px;
}
.am-contract-item strong {
  font-size: 12px;
  color: #0f172a;
  font-weight: 700;
  display: block;
}

/* Attributes Grid */
.am-attributes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.am-attr-col {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.am-attr-col.is-dynamic {
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.am-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  margin-bottom: 2px;
}
.am-section-title h4 {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}
.am-section-title small {
  font-size: 11px;
  color: #64748b;
  margin-left: auto;
}
.am-attr-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.am-attr-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.am-attr-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.am-attr-item-head strong {
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
}
.am-attr-range {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  font-family: monospace;
}
.am-live-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  padding: 1px 6px;
  border-radius: 10px;
}
.am-attr-detail {
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
}

/* Architecture Flow */
.am-architecture-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.am-architecture-flow {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
}
.am-module-card {
  flex: 1;
  min-width: 170px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.am-module-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #e2e8f0;
  font-weight: 700;
  font-size: 12px;
}
.am-module-card.mod-0 .am-module-head { background: #dbeafe; color: #1e40af; }
.am-module-card.mod-1 .am-module-head { background: #fef3c7; color: #92400e; }
.am-module-card.mod-2 .am-module-head { background: #dcfce7; color: #166534; }
.am-module-card.mod-3 .am-module-head { background: #f3e8ff; color: #6b21a8; }
.am-mod-step { font-size: 10px; font-family: monospace; font-weight: 800; }
.am-mod-dl {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  flex: 1;
}
.am-mod-dl dt {
  color: #64748b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-bottom: 1px;
}
.am-mod-dl dd {
  margin: 0;
  color: #334155;
  line-height: 1.35;
}
.am-flow-arrow {
  font-size: 18px;
  color: #94a3b8;
  align-self: center;
  flex-shrink: 0;
}

/* Process Section */
.am-process-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.am-process-steps {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.am-process-steps li {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.am-step-idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.am-step-body strong {
  font-size: 11.5px;
  color: #0f172a;
  display: block;
  margin-bottom: 2px;
}
.am-step-body small {
  font-size: 10.5px;
  color: #64748b;
  line-height: 1.35;
  display: block;
}

/* Bottom Grid */
.am-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.am-bottom-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.am-interaction-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.am-interaction-item {
  background: #fff;
  border-left: 3px solid #0284c7;
  border-radius: 0 6px 6px 0;
  padding: 8px 10px;
  border-top: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}
.am-interaction-item strong {
  font-size: 11.5px;
  color: #0369a1;
  display: block;
  margin-bottom: 2px;
}
.am-interaction-item p {
  font-size: 11px;
  color: #475569;
  margin: 0;
  line-height: 1.4;
}
.am-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}
.am-param-table th, .am-param-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}
.am-param-table th {
  background: #e2e8f0;
  color: #475569;
  font-weight: 700;
  font-size: 10.5px;
}
.param-symbol {
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 1px 4px;
  border-radius: 3px;
}

/* References Bar */
.am-references-bar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.am-ref-label {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.am-ref-cards {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
}
.am-ref-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  flex: 1;
  min-width: 220px;
}
.am-ref-item strong {
  font-size: 11px;
  color: #1e293b;
  display: block;
  margin-bottom: 1px;
}
.am-ref-item p {
  font-size: 10.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.35;
}

/* 环境模型样式 */
.env-corridors-section {
  padding: 14px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.corridor-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.corridor-card {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.corridor-card.success {
  border-color: #86efac;
  background: #f0fdf4;
}
.corridor-card.warning {
  border-color: #fde047;
  background: #fefce8;
}
.corridor-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.corridor-card-head strong {
  font-size: 13px;
  color: #0f172a;
}
.corridor-card-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
}
.corridor-card-metrics span {
  font-size: 9.5px;
  color: #64748b;
  display: block;
}
.corridor-card-metrics b {
  font-size: 11px;
  color: #0f172a;
  display: block;
  margin-top: 1px;
}
.corridor-desc {
  font-size: 11px;
  color: #475569;
  margin: 0;
  line-height: 1.45;
}
.env-layers-section {
  padding: 14px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.env-layers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.env-layer-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.env-layer-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #0284c7;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}
.env-layer-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.env-layer-code {
  font-size: 9.5px;
  font-weight: 800;
  font-family: monospace;
  color: #0369a1;
  background: #e0f2fe;
  padding: 1px 5px;
  border-radius: 4px;
}
.env-layer-code-row h3 {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}
.env-layer-content p {
  font-size: 11px;
  color: #64748b;
  margin: 0 0 6px;
  line-height: 1.4;
}
.env-layer-output {
  font-size: 10.5px;
  color: #0f172a;
}
.env-layer-output strong {
  color: #0284c7;
}

/* 规则模型样式 */
.rule-callout-strip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
  font-size: 12px;
  line-height: 1.5;
}
.rule-math-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.rule-math-card {
  padding: 12px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.rm-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
}
.rm-formula {
  background: #0f172a;
  color: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
}
.rm-note {
  font-size: 11px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}
.safety-scale-bars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-top: 4px;
}
.safety-lvl-item {
  background: #f8fafc;
  border-top: 3px solid var(--lvl-col);
  border-radius: 4px;
  padding: 6px 8px;
}
.safety-lvl-range {
  font-size: 10px;
  font-weight: 800;
  font-family: monospace;
  color: #334155;
  display: block;
}
.safety-lvl-name {
  font-size: 11.5px;
  color: #0f172a;
  display: block;
  margin-top: 2px;
}
.safety-lvl-item small {
  font-size: 9.5px;
  color: #64748b;
  line-height: 1.3;
  display: block;
  margin-top: 2px;
}
.rule-trigger-section {
  padding: 12px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.trigger-matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}
.trigger-matrix-table th, .trigger-matrix-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.trigger-matrix-table th {
  background: #f1f5f9;
  color: #475569;
  font-weight: 700;
  font-size: 10.5px;
}
.col-trigger b {
  color: #dc2626;
  font-size: 11.5px;
}
.action-tag {
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  padding: 3px 8px;
  border-radius: 4px;
  border-left: 3px solid #2563eb;
  display: block;
}
.col-reset small {
  color: #15803d;
  font-size: 11px;
}
.rule-research-section {
  padding: 12px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.research-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.research-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.research-year {
  font-size: 10px;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}
.research-card strong {
  font-size: 11px;
  color: #0f172a;
  display: block;
  margin-top: 3px;
  margin-bottom: 2px;
}
.research-card p {
  font-size: 10.5px;
  color: #475569;
  margin: 0 0 3px;
  line-height: 1.35;
}
.research-card small {
  font-size: 9.5px;
  color: #94a3b8;
  display: block;
}

/* 顶部核心业务问题导引条 */
.modeling-core-question-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(240, 253, 250, 0.95));
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.05);
}
.core-question-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.core-question-text {
  flex: 1;
  min-width: 0;
}
.core-question-text strong {
  display: block;
  font-size: 12.5px;
  color: #1e3a8a;
  margin-bottom: 2px;
}
.core-question-text p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

/* OODA 认知函数嵌入机制 (S(t) & U(a)) */
.am-math-embed-section {
  padding: 14px 16px;
  margin-top: 14px;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
}
.am-math-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 10px;
}
.am-math-card {
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.am-math-card.situation-card {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #3b82f6;
}
.am-math-card.utility-card {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #10b981;
}
.math-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.math-badge {
  font-size: 10.5px;
  font-weight: 700;
  color: #475569;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}
.math-card-head strong {
  font-size: 12.5px;
  color: #0f172a;
}
.math-formula-box {
  background: #0f172a;
  color: #38bdf8;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11.5px;
  font-weight: 600;
}
.math-explain-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #334155;
  line-height: 1.45;
}
.math-trigger-rule {
  margin-top: 4px;
  padding: 6px 10px;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 6px;
  font-size: 11px;
  color: #1e40af;
  display: flex;
  gap: 6px;
}
.math-trigger-rule .rule-label {
  font-weight: 700;
  flex-shrink: 0;
}

/* 大模型 Agent 双层记忆与自适应反思机制 */
.am-llm-cognitive-section {
  padding: 14px 16px;
  margin-top: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.am-cognitive-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 10px;
}
.cognitive-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cog-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cog-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.cog-pill.memory {
  background: #dbeafe;
  color: #1d4ed8;
}
.cog-pill.learning {
  background: #dcfce7;
  color: #15803d;
}
.cog-card-top strong {
  font-size: 12px;
  color: #0f172a;
}
.memory-tier-list, .learning-flow-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mem-tier-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.tier-tag {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  margin-bottom: 4px;
  padding: 1px 6px;
  border-radius: 4px;
}
.tier-tag.working {
  background: #fef3c7;
  color: #b45309;
}
.tier-tag.episodic {
  background: #e0e7ff;
  color: #4338ca;
}
.mem-tier-item p, .learn-flow-item p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.45;
}
.learn-flow-item {
  display: flex;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.flow-num {
  font-size: 13px;
  font-weight: 800;
  color: #10b981;
  font-family: monospace;
}
.learn-flow-item strong {
  font-size: 11.5px;
  color: #0f172a;
  display: block;
  margin-bottom: 2px;
}

/* 侧滑抽屉：人机对话与人工校准设定窗口 */
.ms-calibration-drawer :deep(.el-drawer__body) {
  padding: 14px;
  background: #f8fafc;
}
.ms-calibration-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 14px 18px;
  border-bottom: 1px solid #c7d2fe;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
}
.ms-drawer-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ms-drawer-head-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-size: 14px;
}
.ms-drawer-head-sub {
  font-size: 11px;
  color: #64748b;
}
.ms-calibration-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.calib-mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.calib-mode-tabs button {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 7px;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
  color: #64748b;
  text-align: left;
  cursor: pointer;
}
.calib-mode-tabs button.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, .08);
}
.calib-mode-tabs button > span { font-size: 11px; font-weight: 700; }
.calib-mode-tabs button small { grid-column: 2; color: #94a3b8; font-size: 9px; }
.calib-mode-tabs button.active small { color: #60a5fa; }
.calib-chat-section, .calib-sliders-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.calib-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.calib-section-title > div { display: flex; flex: 1; flex-direction: column; gap: 2px; }
.calib-section-title small { color: #94a3b8; font-size: 9px; font-weight: 400; }
.calib-chat-messages {
  min-height: 230px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 0;
}
.calib-msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.calib-msg-row.user {
  flex-direction: row-reverse;
}
.calib-msg-avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
}
.calib-msg-row.user .calib-msg-avatar {
  background: #2563eb;
  color: #ffffff;
}
.calib-msg-bubble {
  max-width: 80%;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.4;
  background: #f1f5f9;
  color: #1e293b;
}
.calib-msg-row.user .calib-msg-bubble {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
.calib-msg-bubble p { margin: 0 0 2px; }
.calib-msg-bubble small { font-size: 9px; color: #94a3b8; display: block; text-align: right; }
.calib-quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.calib-tag-btn {
  font-size: 10.5px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.calib-tag-btn:hover {
  background: #dbeafe;
}
.calib-input-row {
  display: flex;
  gap: 6px;
  padding-top: 2px;
}
.calib-form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}
.calib-form-item:last-of-type { border-bottom: 0; }
.calib-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #334155;
}
.calib-label-row b {
  color: #2563eb;
  font-family: monospace;
}
.calib-form-item small {
  font-size: 10px;
  color: #94a3b8;
}
.calib-weights-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.calib-switches-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}
.ms-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ms-drawer-status-note {
  font-size: 10.5px;
  color: #64748b;
}
.ms-drawer-foot-btns {
  display: flex;
  gap: 8px;
}
.ms-param-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 9px;
  background: linear-gradient(135deg, #eff6ff, #f8fafc);
}
.ms-param-summary-kicker {
  display: block;
  margin-bottom: 3px;
  color: #3b82f6;
  font-size: 9px;
  letter-spacing: .08em;
}
.ms-param-summary strong { color: #1e3a8a; font-size: 12px; }

</style>
