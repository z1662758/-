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
        <el-button size="small" type="success" plain @click="previewPlanDrawerVisible = true">
          <el-icon><View /></el-icon>
          <span>预演方案预览</span>
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
            <span>01 主体模型</span>
            <small class="tab-chip">智能体与实体</small>
          </button>
          <button :class="{ active: modelingView === 'environment' }" @click="modelingView = 'environment'">
            <el-icon><MapLocation /></el-icon>
            <span>02 环境模型</span>
            <small class="tab-chip">自然与社会环境</small>
          </button>
          <button :class="{ active: modelingView === 'rule' }" @click="modelingView = 'rule'">
            <el-icon><SetUp /></el-icon>
            <span>03 规则模型</span>
            <small class="tab-chip">合约与熔断</small>
          </button>
          <span class="ms-view-tag-count">{{ totalAgentCount }} 个实体已纳入仿真基座</span>
        </nav>

        <!-- ========== 01 主体模型 ========== -->
        <section v-if="modelingView === 'agent'" class="ms-model-view agent-view">
          <div class="model-view-heading">
            <span class="heading-num">01</span>
            <div class="heading-text">
              <p>01 · AGENT MODEL</p>
              <h2>主体模型体系</h2>
              <small>四大类供应链智能体 OODA 认知闭环与 28 个微观实体个体异质性清单。</small>
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
                <span>当前为 <b>{{ activeAgentData.name || activeAgentData.label }}</b> 体系架构规范。已联动下方微观实体清单与异质性参数底账。</span>
              </div>
            </div>
          </article>

          <!-- ========== 群体协同演化规则 (Colony Co-evolution Rules) ========== -->
          <article class="agent-master-card glass-panel" style="margin-top: 14px;">
            <div class="am-section-title">
              <el-icon><Connection /></el-icon>
              <h4>主体个体异质性与群体协同演化规则体系</h4>
              <el-tag size="small" type="primary" effect="dark">群体演化机制</el-tag>
            </div>
            <p class="section-lead-note">
              真实供应链系统中，上游矿山、中游跨境通道与加工基地、下游核电站具有显著的<b>个体异质性</b>（产能规模、所有权属性、库存安全线、违约惩罚弹性不同）。四大主体通过以下三大协同演化规则实现非线性群体自适应收敛：
            </p>

            <div class="coevolution-rules-grid">
              <div class="coevo-rule-card">
                <div class="coevo-head">
                  <span class="coevo-badge">规则 01 · 供需竞价</span>
                  <strong>双轨竞价与长协基线履约演化</strong>
                </div>
                <div class="coevo-body">
                  <p><b>异质性表现：</b>哈萨克斯坦 Katco（原位浸出低成本 $25/lb，受俄过境陆运限制）与纳米比亚湖山矿（自主控股露天矿，海运长协履约率 98%）。</p>
                  <p><b>群体演化逻辑：</b>在现货价格剧烈波动时，智能体群体优先锁定长协基准份额（65%），仅将剩余缺口按自适应出价机制投放到国际现货池，防止个体追高踩踏。</p>
                </div>
              </div>

              <div class="coevo-rule-card">
                <div class="coevo-head">
                  <span class="coevo-badge warning">规则 02 · 动态借调</span>
                  <strong>安全库存破位级联抢单与储备平准演化</strong>
                </div>
                <div class="coevo-body">
                  <p><b>异质性表现：</b>北方包头基地（承载全国 60% 元件制造，库存警戒线 14 周）与南方宜宾基地（常态安全裕度 34 周）。</p>
                  <p><b>群体演化逻辑：</b>当某基地在役库存因通道受阻滑向红线时，触发全局广播并激活自适应应急借调协同，向兄弟基地调拨在途配额并申请国家储备 400 tU 平准介入。</p>
                </div>
              </div>

              <div class="coevo-rule-card">
                <div class="coevo-head">
                  <span class="coevo-badge success">规则 03 · 优先级调度</span>
                  <strong>战略主力堆型燃料特级刚性保供演化</strong>
                </div>
                <div class="coevo-body">
                  <p><b>异质性表现：</b>华龙一号示范机组（首炉燃料刚性装料，断料停堆容忍度 0%）与商用压水堆在役机组（换料窗口柔性后延裕度 15–30 天）。</p>
                  <p><b>群体演化逻辑：</b>演化求解器对不同终端机组赋予差异化惩罚加权 λ₁，一旦运力或原料受限，自动启动刚性优先级，首炉机组独占转化制造产能。</p>
                </div>
              </div>
            </div>
          </article>

          <!-- ========== 微观实体清单与个体异质性矩阵 (28个微观实体) ========== -->
          <article class="agent-master-card glass-panel" style="margin-top: 14px;">
            <div class="am-section-title">
              <el-icon><Tickets /></el-icon>
              <h4>微观实体清单与个体异质性矩阵 (Micro Entity Inventory)</h4>
              <el-tag size="small" type="success" effect="plain">{{ totalAgentCount }} 个微观实体已注册入模</el-tag>
            </div>
            <p class="section-lead-note">
              实体层级细粒度参数已映射至数字孪生实体网络，点击任意实体卡片可查看其差异化初始库存、最大产能吞吐、脆弱度与契约约束：
            </p>

            <!-- 实体分类过滤标签 -->
            <div class="entity-filter-tabs">
              <button
                type="button"
                class="entity-filter-btn"
                :class="{ active: roleFilterTier === 'all' }"
                @click="roleFilterTier = 'all'"
              >
                全部实体 ({{ totalAgentCount }})
              </button>
              <button
                v-for="grp in agentGroups"
                :key="grp.tier"
                type="button"
                class="entity-filter-btn"
                :class="{ active: roleFilterTier === grp.tier }"
                @click="roleFilterTier = grp.tier"
              >
                {{ grp.label }} ({{ grp.members.length }})
              </button>
            </div>

            <!-- 实体网格卡片 -->
            <div class="entity-cards-waterfall">
              <div
                v-for="grp in filteredGroups"
                :key="grp.tier"
                class="entity-group-block"
              >
                <div class="eg-header">
                  <i class="ms-tier-dot" :class="grp.tier"></i>
                  <strong>{{ grp.label }}</strong>
                  <span class="eg-count">{{ grp.members.length }} 个节点</span>
                </div>
                <div class="eg-items-grid">
                  <div
                    v-for="mem in grp.members"
                    :key="mem.key"
                    class="eg-card"
                    :class="{ active: mem.key === selectedKey }"
                    @click="selectMember(mem)"
                  >
                    <div class="eg-card-top">
                      <strong class="eg-name">{{ mem.name }}</strong>
                      <span class="eg-tier-badge" :class="grp.tier">{{ grp.label.slice(0, 2) }}</span>
                    </div>
                    <p class="eg-desc">{{ mem.note }}</p>
                    <div class="eg-card-foot">
                      <span class="eg-id-chip">{{ mem.id }}</span>
                      <span class="eg-view-link">查看异质档案 ›</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- ========== 微观主体复杂网络拓扑关系底座 (对齐会议纪要：整合微观实体清单与复杂网络拓扑关系) ========== -->
          <article class="agent-master-card glass-panel" style="margin-top: 14px;">
            <div class="am-section-title" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon><Connection /></el-icon>
                <h4 style="margin: 0;">微观主体复杂网络拓扑关系底座 (Micro Agent & Complex Network Topology Base)</h4>
                <el-tag size="small" type="primary" effect="dark">28 个微观实体 · 36 条拓扑链路</el-tag>
              </div>
              <span style="font-size: 12px; color: #94a3b8;">对齐会议纪要：整合微观实体清单与拓扑链路关系，刻画节点度数、介数瓶颈与级联断裂</span>
            </div>
            <p class="section-lead-note" style="margin-bottom: 12px;">
              微观实体并非孤立存在，上游海外矿山、跨境枢纽口岸、制造加工基地与终端核电机组通过 36 条海陆调度边相连，形成高聚集、高介数依赖的多智能体供应链网络（点击任意节点可滑出微观拓扑特征抽屉）：
            </p>
            <div class="topo-embed-box">
              <UraniumModelingTopology :groups="agentGroups" :selected-tier="selectedMember?.tier" @select="selectGroup" />
            </div>
          </article>
        </section>

        <!-- ========== 02 环境模型 ========== -->
        <section v-else-if="modelingView === 'environment'" class="ms-model-view environment-view">
          <div class="model-view-heading">
            <span class="heading-num">02</span>
            <div class="heading-text">
              <p>02 · ENVIRONMENT MODEL</p>
              <h2>环境模型与通道网络</h2>
              <small>自然物理航道与社会地缘规则双核解耦，构建复杂网络调度底座。</small>
            </div>
          </div>

          <!-- 全球陆海战略走廊与地缘环境态势数字孪生沙盘 (对齐会议纪要：区分自然海运航线与社会地缘制裁，支撑动态外部条件设定) -->
          <div class="env-corridor-map-container" style="margin-bottom: 16px;">
            <UraniumEnvironmentCorridorMap :conditions="dynamicEnvConditions" />
          </div>

          <!-- 自然环境 vs 社会环境解耦双核面板 -->
          <div class="env-dual-decouple-grid">
            <!-- 🌿 自然地理环境 -->
            <article class="env-decouple-card natural glass-panel">
              <div class="env-decouple-header">
                <div class="ed-title-row">
                  <span class="ed-tag natural">🌿 自然物理环境 (Natural Environment)</span>
                  <el-tag size="small" type="success" effect="plain">地理走廊与海运航道</el-tag>
                </div>
                <h3>远洋深水航线、关键海峡与物理通过能力</h3>
                <p>为智能体提供刚性空间地理拓扑、物理航行时滞、恶劣海况损耗与港口吃水约束。</p>
              </div>

              <div class="env-decouple-factors">
                <div class="ed-factor-item">
                  <strong>远洋深水海运走廊</strong>
                  <p>非洲鲸湾港–大西洋–好望角–马六甲海峡–连云港/防城港，全长 11,200 海里，航期 32 天，单船最大载运 1,200 tU。</p>
                </div>
                <div class="ed-factor-item">
                  <strong>关键海峡与口岸咽喉</strong>
                  <p>马六甲海峡航道通航密度、苏伊士运河通行限制；中欧班列中亚阿拉山口陆路铁路口岸换轨极限（负荷上限 900 tU/年）。</p>
                </div>
                <div class="ed-factor-item">
                  <strong>物理港口与自然损耗</strong>
                  <p>连云港/防城港深水 Class 7 放射性专用码头接卸能力，极端季风海况航程延误概率与运输途耗。</p>
                </div>
              </div>
            </article>

            <!-- 🏛️ 社会地缘环境 -->
            <article class="env-decouple-card social glass-panel">
              <div class="env-decouple-header">
                <div class="ed-title-row">
                  <span class="ed-tag social">🏛️ 社会制度环境 (Social Environment)</span>
                  <el-tag size="small" type="danger" effect="plain">地缘政治与经贸制裁</el-tag>
                </div>
                <h3>地缘政治制裁、国际长协框架与贸易清算壁垒</h3>
                <p>为智能体博弈提供外部地缘冲击、主权国家长协法律保障、金融结算限制与行政调度指令。</p>
              </div>

              <div class="env-decouple-factors">
                <div class="ed-factor-item">
                  <strong>地缘政治制裁法案</strong>
                  <p>美欧对俄核燃料次级制裁与关键矿产涉俄脱钩管制清单，地缘断供扰动指数 0.75，引发中亚陆运过境风险溢价。</p>
                </div>
                <div class="ed-factor-item">
                  <strong>国际长协与主权担保</strong>
                  <p>中哈、中非国家间双边战略核能合作协议与主权履约机制，奠定基线 65% 长协供应的刚性法律履约保障。</p>
                </div>
                <div class="ed-factor-item">
                  <strong>关税壁垒与跨境支付</strong>
                  <p>非美货币双边结算通道，SWIFT 制裁威胁下的现货信用证审核周期与跨境危化品国际交割保险溢价（+15%）。</p>
                </div>
              </div>
            </article>
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

          <!-- ========== 动态外部条件设定与环境扰动场注入 (对齐会议纪要：区分自然与社会环境，支撑动态外部条件设定) ========== -->
          <article class="env-disturbance-panel glass-panel" style="margin-top: 14px;">
            <div class="am-section-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon><Compass /></el-icon>
                <h4 style="margin: 0;">动态外部条件设定与扰动场注入 (Dynamic Disturbance Environment Canvas)</h4>
                <el-tag size="small" type="danger" effect="plain">外部动态输入</el-tag>
              </div>
              <span style="font-size: 12px; color: #94a3b8;">对齐会议纪要：区分自然与社会环境，支撑动态外部条件设定，驱动 OODA 态势函数 S(t)</span>
            </div>
            <p class="section-lead-note" style="margin-bottom: 14px;">
              自然物理环境（海况、运力时效）与社会制度环境（制裁烈度、金融结算）解耦为多智能体系统的外部<b>动态扰动场</b>。您可调节动态参数或一键注入典型外部极端情景：
            </p>

            <!-- 快捷预设情景注入按钮组 -->
            <div class="env-preset-bar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: #94a3b8; align-self: center; margin-right: 4px;">外部情景预设注入：</span>
              <el-button size="small" :type="dynamicEnvConditions.activePresetScenario === 'baseline' ? 'success' : 'default'" plain @click="applyPresetEnvScenario('baseline')">
                🌿 常态平稳运行
              </el-button>
              <el-button size="small" :type="dynamicEnvConditions.activePresetScenario === 'sanction_surge' ? 'warning' : 'default'" plain @click="applyPresetEnvScenario('sanction_surge')">
                🏛️ 美欧次级制裁升级 (R_geo = 0.85)
              </el-button>
              <el-button size="small" :type="dynamicEnvConditions.activePresetScenario === 'sea_blockade' ? 'danger' : 'default'" plain @click="applyPresetEnvScenario('sea_blockade')">
                🌊 关键海峡受阻与港口滞期 (C_corridor = 0.45)
              </el-button>
              <el-button size="small" :type="dynamicEnvConditions.activePresetScenario === 'dual_extreme' ? 'danger' : 'default'" effect="dark" @click="applyPresetEnvScenario('dual_extreme')">
                ⚡ 自然+社会双重极端断供冲击
              </el-button>
            </div>

            <!-- 动态参数设定双栏滑块网格 -->
            <div class="env-params-interactive-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- 左栏：自然物理环境动态条件 -->
              <div class="env-slider-col natural" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 700; color: #34d399; font-size: 13px;">🌿 自然地理环境动态参数</span>
                  <el-tag size="small" type="success">海运走廊与口岸</el-tag>
                </div>
                <div class="env-slider-item" style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>好望角-马六甲航路通畅度</span>
                    <b>{{ dynamicEnvConditions.corridorSeaOpenness }}%</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.corridorSeaOpenness" :min="20" :max="100" size="small" />
                </div>
                <div class="env-slider-item" style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>沿海港口季风/滞期额外时滞</span>
                    <b>+{{ dynamicEnvConditions.portMonsoonDelayDays }} 天</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.portMonsoonDelayDays" :min="0" :max="20" size="small" />
                </div>
                <div class="env-slider-item">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>阿拉山口中欧班列换轨负荷率</span>
                    <b :style="{ color: dynamicEnvConditions.alashankouCongestion > 90 ? '#f43f5e' : '#38bdf8' }">{{ dynamicEnvConditions.alashankouCongestion }}%</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.alashankouCongestion" :min="40" :max="100" size="small" />
                </div>
              </div>

              <!-- 右栏：社会制度环境动态条件 -->
              <div class="env-slider-col social" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 700; color: #f87171; font-size: 13px;">🏛️ 社会制度环境动态参数</span>
                  <el-tag size="small" type="danger">地缘制裁与金融</el-tag>
                </div>
                <div class="env-slider-item" style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>美欧涉俄次级制裁扰动烈度 R_geo(t)</span>
                    <b style="color: #f87171;">{{ dynamicEnvConditions.geoSanctionSeverity }}</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.geoSanctionSeverity" :min="0" :max="1" :step="0.05" size="small" />
                </div>
                <div class="env-slider-item" style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>非美跨境金融结算摩擦阻力</span>
                    <b>{{ dynamicEnvConditions.swiftSettlementFriction }}</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.swiftSettlementFriction" :min="0" :max="1" :step="0.05" size="small" />
                </div>
                <div class="env-slider-item">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                    <span>国际危化品航运交割保费上浮</span>
                    <b>+{{ dynamicEnvConditions.insuranceSurgeRate }}%</b>
                  </div>
                  <el-slider v-model="dynamicEnvConditions.insuranceSurgeRate" :min="0" :max="50" size="small" />
                </div>
              </div>
            </div>

            <!-- 动态外部扰动输出实时计算条 -->
            <div class="env-dynamic-calc-strip" style="margin-top: 14px; background: rgba(30, 41, 59, 0.7); border: 1px dashed rgba(148, 163, 184, 0.3); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon color="#38bdf8"><DataLine /></el-icon>
                <span style="font-size: 13px; color: #e2e8f0;">当前外部动态扰动实时映射输出：</span>
              </div>
              <div style="display: flex; gap: 16px; font-size: 12px;">
                <span>综合地缘扰动 R_geo：<b style="color: #f87171;">{{ computedGeoDisturbance }}</b></span>
                <span>通道通畅度 C_corridor：<b style="color: #34d399;">{{ computedCorridorOpenness }}</b></span>
                <span>驱动 OODA 感知 S(t)：<b style="color: #fbbf24;">{{ computedSValueOfEnv }}</b> ({{ computedSValueOfEnv >= 0.75 ? '触发应急保供' : '处于常态运行' }})</span>
              </div>
            </div>
          </article>
        </section>

        <!-- ========== 03 规则模型 ========== -->
        <section v-else-if="modelingView === 'rule'" class="ms-model-view rule-view">
          <div class="model-view-heading">
            <span class="heading-num">03</span>
            <div class="heading-text">
              <p>03 · RULE MODEL</p>
              <h2>仿真与风控规则模型</h2>
              <small>安全库存红线、IAEA 保供准则与自适应应急调度触发矩阵。</small>
            </div>
          </div>

          <!-- 规则提示 Callout -->
          <div class="rule-callout-strip">
            <el-icon><InfoFilled /></el-icon>
            <p><strong>仿真规程遵循 IAEA 与国家战略物资保供准则：</strong>“安全保供”拥有最高优先级。当各基地库存跌破 16 周安全警戒底线或国际现货非理性暴涨突破 $85/lb 时，算法强制启动逆周期削峰调度。</p>
          </div>

          <!-- 4 大核心契约与规则约束体系 -->
          <div class="rule-contracts-section glass-panel" style="margin-bottom: 14px;">
            <div class="am-section-title" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon><Tickets /></el-icon>
                <h4 style="margin: 0;">4 大核心契约与规则约束体系 (Core Contract Architecture)</h4>
              </div>
              <el-tag size="small" type="primary" effect="plain">刚性履约与协同红线</el-tag>
            </div>
            <div class="rule-contracts-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px;">
              <div class="contract-spec-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; color: #38bdf8; font-weight: 700;">契约 01</span>
                  <el-tag size="small" type="success" effect="plain">基线刚性</el-tag>
                </div>
                <strong style="display: block; font-size: 13px; color: #f1f5f9; margin-bottom: 4px;">长期协议保供刚性履约契约</strong>
                <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">海外自主矿山与国家主权间长协框架，锁定 65% 基准份额，履约考核权重 λ₁ = 0.45，禁止无故单方违约退运。</p>
              </div>
              <div class="contract-spec-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; color: #fbbf24; font-weight: 700;">契约 02</span>
                  <el-tag size="small" type="warning" effect="plain">自适应出价</el-tag>
                </div>
                <strong style="display: block; font-size: 13px; color: #f1f5f9; margin-bottom: 4px;">双轨竞价与现货补缺规则</strong>
                <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">当长协份额不足以覆盖 14 周缺口时，启动现货市场逆向出价机制；现货敞口严格限制在 35% 以内，防范追涨踩踏。</p>
              </div>
              <div class="contract-spec-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; color: #c084fc; font-weight: 700;">契约 03</span>
                  <el-tag size="small" type="primary" effect="plain">跨基地平准</el-tag>
                </div>
                <strong style="display: block; font-size: 13px; color: #f1f5f9; margin-bottom: 4px;">跨基地动态借调平准契约</strong>
                <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">包头基地库存降至 14 周红线时，触发全网平准广播，优先借调防城港在途配额，并申请国家战略储备 400 tU 削峰。</p>
              </div>
              <div class="contract-spec-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; color: #f43f5e; font-weight: 700;">契约 04</span>
                  <el-tag size="small" type="danger" effect="plain">特级最高优先</el-tag>
                </div>
                <strong style="display: block; font-size: 13px; color: #f1f5f9; margin-bottom: 4px;">战略主力机组特级保供契约</strong>
                <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">“华龙一号”与首炉装料示范工程享有 100% 绝对刚性优先级，任何外部断供情景下，转化与制造产能独占分配。</p>
              </div>
            </div>
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

    <!-- 侧滑抽屉：预演方案与沙盘底座基线矩阵控制台 (对齐会议纪要待办：补充预演方案预览界面) -->
    <el-drawer
      v-model="previewPlanDrawerVisible"
      title="沙盘推演预演方案控制台"
      size="780px"
      direction="rtl"
      class="ms-preview-plan-drawer"
    >
      <template #header>
        <div class="ms-drawer-head">
          <div class="ms-drawer-head-title">
            <el-icon><View /></el-icon>
            <strong>沙盘推演预演方案控制台 (Simulation Protocol Studio)</strong>
          </div>
          <small class="ms-drawer-head-sub">整合主体异质性、环境动态扰动场与规则刚性红线，支持多套预演方案横向比选与量化指标预测</small>
        </div>
      </template>

      <div class="ms-preview-plan-body" style="padding: 10px 0; display: flex; flex-direction: column; gap: 16px;">
        <!-- 方案横向比选切换 Tab -->
        <div class="plan-selector-strip glass-panel" style="padding: 10px; border-radius: 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>选择预演方案比选基准 (PRESET SELECTION)：</span>
            <span style="color: #38bdf8;">当前选中：{{ activePlan.id }}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <button
              v-for="(p, pKey) in previewPlans"
              :key="pKey"
              type="button"
              class="plan-tab-btn"
              :class="{ active: activePreviewPlanKey === pKey }"
              :style="{
                background: activePreviewPlanKey === pKey ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                border: activePreviewPlanKey === pKey ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }"
              @click="selectPreviewPlan(pKey)"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <b style="font-size: 12px; color: #f8fafc;">{{ p.name.split('·')[0] }}</b>
                <el-tag size="small" :type="p.tagType" effect="dark">{{ p.badgeText }}</el-tag>
              </div>
              <small style="display: block; font-size: 11px; color: #94a3b8; line-height: 1.3;">{{ p.name.split('·')[1] }}</small>
            </button>
          </div>
        </div>

        <!-- 当前选定方案的元数据卡片 -->
        <div class="plan-meta-banner glass-panel" style="padding: 12px 16px; border-radius: 8px; border-left: 4px solid #38bdf8; background: rgba(30, 41, 59, 0.7);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 15px; color: #f1f5f9;">{{ activePlan.name }}</strong>
            <span style="font-size: 11px; font-family: monospace; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">{{ activePlan.id }}</span>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">{{ activePlan.desc }}</p>
          <div style="display: flex; gap: 16px; font-size: 11px; color: #94a3b8; flex-wrap: wrap;">
            <span>⏱️ <b>推演时域：</b>{{ activePlan.horizon }}</span>
            <span>🎲 <b>采样规模：</b>{{ activePlan.monteCarlo }}</span>
            <span>🎯 <b>停止准则：</b>{{ activePlan.convergence }}</span>
          </div>
        </div>

        <!-- 预期推演实验 KPI 量化预测面板 (Expected KPI Projections) -->
        <div class="plan-kpi-projections-panel glass-panel" style="padding: 14px; border-radius: 8px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <el-icon color="#38bdf8"><Histogram /></el-icon>
              <strong style="font-size: 13px; color: #f1f5f9;">预期仿真衡算指标量化预测 (Simulation Forecast)</strong>
            </div>
            <el-tag size="small" type="primary" effect="plain">蒙特卡洛 1,000 轮置信区间</el-tag>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div class="kpi-mini-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px; text-align: center;">
              <small style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 2px;">战略保供履约率</small>
              <strong style="color: #34d399; font-size: 18px; font-weight: 800;">{{ activePlan.kpiProjections.fulfillmentRate }}</strong>
              <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">全网各机组综合</span>
            </div>
            <div class="kpi-mini-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 6px; padding: 10px; text-align: center;">
              <small style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 2px;">到岸平准化成本</small>
              <strong style="color: #fbbf24; font-size: 18px; font-weight: 800;">{{ activePlan.kpiProjections.landedCost }}</strong>
              <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">浮动 {{ activePlan.kpiProjections.costSurge }}</span>
            </div>
            <div class="kpi-mini-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 10px; text-align: center;">
              <small style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 2px;">级联雪崩风险度</small>
              <strong style="color: #c084fc; font-size: 18px; font-weight: 800;">{{ activePlan.kpiProjections.cascadeRisk.split(' ')[0] }}</strong>
              <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">相比原始断裂压降</span>
            </div>
            <div class="kpi-mini-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 10px; text-align: center;">
              <small style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 2px;">示范机组停堆风险</small>
              <strong style="color: #38bdf8; font-size: 18px; font-weight: 800;">{{ activePlan.kpiProjections.unplannedOutage.split(' ')[0] }}</strong>
              <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">华龙一号首炉刚性</span>
            </div>
          </div>
        </div>

        <!-- 三位一体方案要素矩阵规格卡片 (主体、环境、规则) -->
        <div class="plan-three-pillars-grid" style="display: flex; flex-direction: column; gap: 10px;">
          <!-- 01 主体模型要素 -->
          <div class="pillar-card glass-panel" style="padding: 12px 14px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #38bdf8; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <el-icon><User /></el-icon> 01 主体模型配置 (Agent Specification & Topology)
              </strong>
              <el-tag size="small" type="success" effect="plain">{{ activePlan.agentConfig.activeNodes }}</el-tag>
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.6; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>• <b>优先级策略：</b>{{ activePlan.agentConfig.hualongPriority }}</div>
              <div>• <b>库存警戒线：</b>{{ activePlan.agentConfig.baotouSafeWeeks }}</div>
              <div>• <b>记忆架构：</b>{{ activePlan.agentConfig.dualMemory }}</div>
              <div>• <b>自适应反思：</b>{{ activePlan.agentConfig.reflexion }}</div>
            </div>
          </div>

          <!-- 02 环境模型动态工况 -->
          <div class="pillar-card glass-panel" style="padding: 12px 14px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #34d399; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <el-icon><MapLocation /></el-icon> 02 环境模型工况 (Natural Maritime & Geopolitical Regimes)
              </strong>
              <el-tag size="small" :type="activePlan.tagType" effect="dark">{{ activePlan.tag }}</el-tag>
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.6; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>• <b>海运走廊通畅度：</b>{{ activePlan.envConfig.seaOpenness }}</div>
              <div>• <b>港口水文滞期：</b>{{ activePlan.envConfig.portDelay }}</div>
              <div>• <b>口岸换轨负荷：</b>{{ activePlan.envConfig.landCongestion }}</div>
              <div>• <b>涉俄次级制裁 R_geo：</b>{{ activePlan.envConfig.geoSanction }}</div>
            </div>
          </div>

          <!-- 03 规则模型约束与熔断 -->
          <div class="pillar-card glass-panel" style="padding: 12px 14px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #fbbf24; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <el-icon><SetUp /></el-icon> 03 规则模型约束与熔断机制 (Contracts & Circuit Breakers)
              </strong>
              <el-tag size="small" type="danger" effect="plain">刚性保供约束</el-tag>
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.6; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>• <b>长协基准保障：</b>{{ activePlan.ruleConfig.contractBase }}</div>
              <div>• <b>现货敞口红线：</b>{{ activePlan.ruleConfig.spotCap }}</div>
              <div>• <b>储备借调平准：</b>{{ activePlan.ruleConfig.bufferBorrow }}</div>
              <div>• <b>现货熔断触发：</b>{{ activePlan.ruleConfig.circuitBreakerPrice }}</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="ms-drawer-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-tag size="small" type="info">参数协议就绪</el-tag>
            <span style="font-size: 12px; color: #94a3b8;">已校准 IAEA/中核集团保供规程标准</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <el-button size="small" @click="previewPlanDrawerVisible = false">关闭预览</el-button>
            <el-button size="small" type="primary" @click="applySelectedPlanAndProceed">
              <span>应用【{{ activePlan.name.split('·')[0].trim() }}】并进入想定生成</span>
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 统一流程导航（右下角规范悬浮） -->
    <DuringWorkflowNav
      back="/home/SCnet/total"
      back-label="阶段选择"
      next="/home/SCnet/scenarioAnalysis"
      next-label="下一步：想定生成"
    />
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
  Grid, Check, Setting, View, Compass, DataLine
} from '@element-plus/icons-vue'
import MidStagePageHeader from './components/shared/MidStagePageHeader.vue'
import UraniumModelingTopology from './components/simulation/UraniumModelingTopology.vue'
import UraniumEnvironmentCorridorMap from './components/simulation/UraniumEnvironmentCorridorMap.vue'
import DuringWorkflowNav from './components/DuringWorkflowNav.vue'
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
const previewPlanDrawerVisible = ref(false)
const roleFilterTier = ref('all')
const calibrationTab = ref('chat')

// 动态外部环境扰动条件设定 (对齐会议纪要：区分自然与社会环境，支撑动态外部条件设定)
const dynamicEnvConditions = reactive({
  corridorSeaOpenness: 85, // 好望角-马六甲海运通畅度 %
  portMonsoonDelayDays: 3, // 沿海港口季风/滞期额外时滞 天
  alashankouCongestion: 78, // 阿拉山口口岸换轨负荷率 %
  geoSanctionSeverity: 0.75, // 美欧涉俄涉疆次级制裁烈度 (0~1)
  swiftSettlementFriction: 0.60, // 跨境结算与支付摩擦阻力 (0~1)
  insuranceSurgeRate: 15, // 海运危化品交割保险溢价 %
  activePresetScenario: 'sanction_surge' // 预设情景
})

const computedGeoDisturbance = computed(() => {
  return Number((dynamicEnvConditions.geoSanctionSeverity * 0.5 + dynamicEnvConditions.swiftSettlementFriction * 0.3 + (dynamicEnvConditions.insuranceSurgeRate / 50) * 0.2).toFixed(2))
})

const computedCorridorOpenness = computed(() => {
  const sea = dynamicEnvConditions.corridorSeaOpenness / 100
  const land = 1 - (dynamicEnvConditions.alashankouCongestion / 100)
  return Number((sea * 0.6 + land * 0.4).toFixed(2))
})

const computedSValueOfEnv = computed(() => {
  // S(t) = w1*R_geo + w2*(1-C_corridor) + w3*StockGap
  const rGeo = computedGeoDisturbance.value
  const cCorridor = computedCorridorOpenness.value
  return Number((0.4 * rGeo + 0.35 * (1 - cCorridor) + 0.25 * 0.70).toFixed(2))
})

function applyPresetEnvScenario(type) {
  dynamicEnvConditions.activePresetScenario = type
  if (type === 'baseline') {
    dynamicEnvConditions.corridorSeaOpenness = 95
    dynamicEnvConditions.portMonsoonDelayDays = 1
    dynamicEnvConditions.alashankouCongestion = 60
    dynamicEnvConditions.geoSanctionSeverity = 0.20
    dynamicEnvConditions.swiftSettlementFriction = 0.15
    dynamicEnvConditions.insuranceSurgeRate = 5
    ElMessage.success('已切换为「基线常态平稳」外部环境条件')
  } else if (type === 'sanction_surge') {
    dynamicEnvConditions.corridorSeaOpenness = 85
    dynamicEnvConditions.portMonsoonDelayDays = 2
    dynamicEnvConditions.alashankouCongestion = 92
    dynamicEnvConditions.geoSanctionSeverity = 0.85
    dynamicEnvConditions.swiftSettlementFriction = 0.80
    dynamicEnvConditions.insuranceSurgeRate = 25
    ElMessage.warning('已注入「涉俄次级制裁升级与跨境结算受阻」外部扰动环境')
  } else if (type === 'sea_blockade') {
    dynamicEnvConditions.corridorSeaOpenness = 45
    dynamicEnvConditions.portMonsoonDelayDays = 12
    dynamicEnvConditions.alashankouCongestion = 96
    dynamicEnvConditions.geoSanctionSeverity = 0.65
    dynamicEnvConditions.swiftSettlementFriction = 0.40
    dynamicEnvConditions.insuranceSurgeRate = 35
    ElMessage.error('已注入「关键海峡通行受阻与港口极端滞期」外部自然地理扰动')
  } else if (type === 'dual_extreme') {
    dynamicEnvConditions.corridorSeaOpenness = 40
    dynamicEnvConditions.portMonsoonDelayDays = 14
    dynamicEnvConditions.alashankouCongestion = 98
    dynamicEnvConditions.geoSanctionSeverity = 0.95
    dynamicEnvConditions.swiftSettlementFriction = 0.90
    dynamicEnvConditions.insuranceSurgeRate = 45
    ElMessage.error('已注入「自然海峡封锁 + 地缘全面脱钩」双重极端极端冲击场！')
  }
}

// ==================== 预演方案与沙盘底座基线矩阵控制台数据 ====================
const activePreviewPlanKey = ref('planA')
const previewPlans = reactive({
  planA: {
    id: 'SCNET-2024-URANIUM-PRESET-A',
    name: '方案 A · 战略长协刚性履约方案 (推荐基准)',
    tag: '常态稳健型',
    tagType: 'success',
    badgeText: '推荐基准',
    desc: '面向常态及轻度地缘制裁扰动，优先锁定中哈/中非 65% 基线长协配额，辅以 400 tU 国家储备平准借调。',
    horizon: '2024–2028 (5年期 / 20季滚动步进)',
    convergence: '李喆认知不确定性收敛停止准则 (ε ≤ 0.05)',
    monteCarlo: '1,000 轮蒙特卡洛实验采样',
    agentConfig: {
      activeNodes: '28 个微观实体全部入模',
      hualongPriority: '华龙一号 P0 绝对刚性优先级 (权重 λ₁ = 0.45)',
      baotouSafeWeeks: '14 周安全库存警戒底线',
      dualMemory: '张明双层记忆机制 (12步FIFO工作记忆 + 情景知识库)',
      reflexion: '推演后自适应 Reflexion 认知反思演化'
    },
    envConfig: {
      seaOpenness: '85% (好望角-马六甲海运稳态)',
      portDelay: '+3 天 (港口轻微水文时滞)',
      landCongestion: '78% (阿拉山口口岸平稳换轨)',
      geoSanction: '0.75 (涉俄次级脱钩中度管制)',
      settlementFriction: '0.60 (双边本币非美清算通道)'
    },
    ruleConfig: {
      contractBase: '65% 刚性基准长协份额保障',
      spotCap: '35% 现货采购敞口上限 (防踩踏)',
      bufferBorrow: '14周破线自动申请 400 tU 储备借调',
      circuitBreakerPrice: '$85/lb (国际现货暴涨刚性熔断)'
    },
    kpiProjections: {
      fulfillmentRate: '97.4%',
      landedCost: '$76.8 / kgU',
      costSurge: '+8.5%',
      cascadeRisk: '0.26 (低危，压降 65%)',
      unplannedOutage: '0 台次 (示范工程 100% 达成)'
    }
  },
  planB: {
    id: 'SCNET-2024-URANIUM-PRESET-B',
    name: '方案 B · 地缘次级制裁与远洋绕行方案',
    tag: '远洋分流型',
    tagType: 'warning',
    badgeText: '地缘承压',
    desc: '假定美欧对俄次级制裁升级导致中亚陆运过境受阻，强制启动海运南移 55% 分流与跨里海铁海联运。',
    horizon: '2024–2028 (5年期 / 20季滚动步进)',
    convergence: '李喆认知不确定性收敛停止准则 (ε ≤ 0.05)',
    monteCarlo: '1,000 轮蒙特卡洛实验采样',
    agentConfig: {
      activeNodes: '28 个实体 (中亚陆运配额动态削减 40%)',
      hualongPriority: '华龙一号 P0 绝对优先独占南方基地',
      baotouSafeWeeks: '14 周警戒 (北方库存承压)',
      dualMemory: '启用历史断供案例向量化检索 (2022俄乌案例)',
      reflexion: '动态提高运力风险厌恶系数 γ = 0.85'
    },
    envConfig: {
      seaOpenness: '92% (大西洋-印度洋深水直航提速)',
      portDelay: '+5 天 (南方港口集中接卸滞期)',
      landCongestion: '94% (阿拉山口口岸极度拥堵)',
      geoSanction: '0.85 (次级制裁全面升级)',
      settlementFriction: '0.80 (SWIFT 清算摩擦加剧)'
    },
    ruleConfig: {
      contractBase: '60% 基线长协份额',
      spotCap: '40% 跨区调拨现货补充',
      bufferBorrow: '强制启动防城港保税库对北方紧急调拨',
      circuitBreakerPrice: '$92/lb (上浮容忍度熔断)'
    },
    kpiProjections: {
      fulfillmentRate: '94.8%',
      landedCost: '$84.2 / kgU',
      costSurge: '+18.2%',
      cascadeRisk: '0.38 (中危受控)',
      unplannedOutage: '0 台次 (关键机组重点保供)'
    }
  },
  planC: {
    id: 'SCNET-2024-URANIUM-PRESET-C',
    name: '方案 C · 极端双重断供与全网平准方案',
    tag: '极限抗扰型',
    tagType: 'danger',
    badgeText: '极端极限',
    desc: '假定自然海峡封锁叠加地缘全面脱钩，系统启动极限应急保供工作专班，全网南北基地紧急调拨与战略储备顶格平准。',
    horizon: '2024–2028 (5年期 / 20季滚动步进)',
    convergence: '李喆认知不确定性收敛停止准则 (ε ≤ 0.05)',
    monteCarlo: '1,000 轮蒙特卡洛实验采样',
    agentConfig: {
      activeNodes: '28 个实体全量协同激活',
      hualongPriority: '特级优先级独占全部在役库存',
      baotouSafeWeeks: '12 周破线极限保供状态',
      dualMemory: '极限工况自适应 Prompt 重构',
      reflexion: '跨轮次多目标帕累托前沿寻优'
    },
    envConfig: {
      seaOpenness: '45% (关键海峡受阻)',
      portDelay: '+14 天 (极端滞期与管制)',
      landCongestion: '98% (口岸限流与全面排查)',
      geoSanction: '0.95 (地缘博弈全面脱钩)',
      settlementFriction: '0.90 (非美清算高摩擦)'
    },
    ruleConfig: {
      contractBase: '55% 刚性主权框架',
      spotCap: '25% (严控追涨踩踏)',
      bufferBorrow: '顶格调用国家战略储备 600 tU 平准介入',
      circuitBreakerPrice: '$85/lb (强制熔断现货，禁止追涨)'
    },
    kpiProjections: {
      fulfillmentRate: '91.6%',
      landedCost: '$89.5 / kgU',
      costSurge: '+24.6%',
      cascadeRisk: '0.45 (极限平准承压)',
      unplannedOutage: '0 台次 (零停堆底线死守)'
    }
  }
})

const activePlan = computed(() => previewPlans[activePreviewPlanKey.value] || previewPlans.planA)

function selectPreviewPlan(planKey) {
  activePreviewPlanKey.value = planKey
  if (planKey === 'planA') {
    applyPresetEnvScenario('baseline')
  } else if (planKey === 'planB') {
    applyPresetEnvScenario('sanction_surge')
  } else if (planKey === 'planC') {
    applyPresetEnvScenario('dual_extreme')
  }
  ElMessage.success(`已切换预览：${activePlan.value.name}`)
}

function applySelectedPlanAndProceed() {
  ElMessage.success(`已成功锁定【${activePlan.value.name}】，方案矩阵已就绪，立即流转想定生成！`)
  previewPlanDrawerVisible.value = false
  goNext()
}
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
  if (activePreviewPlanKey.value) {
    query.plan = activePreviewPlanKey.value
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

/* 群体协同演化规则 */
.coevolution-rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.coevo-rule-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
}
.coevo-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}
.coevo-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 6px;
  border-radius: 4px;
}
.coevo-badge.warning {
  color: #d97706;
  background: #fffbeb;
  border-color: #fde68a;
}
.coevo-badge.success {
  color: #059669;
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.coevo-head strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.coevo-body p {
  margin: 0 0 6px;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.5;
}
.coevo-body p:last-child {
  margin-bottom: 0;
}

/* 微观实体清单瀑布流与过滤 */
.entity-filter-tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  flex-wrap: wrap;
}
.entity-filter-btn {
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.entity-filter-btn:hover {
  border-color: #93c5fd;
  color: #2563eb;
}
.entity-filter-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.entity-cards-waterfall {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.entity-group-block {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
}
.eg-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.eg-header strong {
  font-size: 13px;
  color: #0f172a;
}
.eg-count {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
}
.eg-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}
.eg-card {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.eg-card:hover {
  border-color: #93c5fd;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
}
.eg-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.eg-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.eg-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
}
.eg-tier-badge {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: #e2e8f0;
  color: #475569;
}
.eg-desc {
  margin: 0 0 8px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
.eg-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed #e2e8f0;
  padding-top: 6px;
}
.eg-id-chip {
  font-size: 10px;
  font-family: monospace;
  color: #94a3b8;
}
.eg-view-link {
  font-size: 10.5px;
  color: #2563eb;
  font-weight: 600;
}

/* 环境双核解耦卡片 */
.env-dual-decouple-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.env-decouple-card {
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.env-decouple-card.natural {
  border-top: 3px solid #10b981;
  background: linear-gradient(180deg, rgba(236, 253, 245, 0.5) 0%, rgba(255, 255, 255, 0.9) 100%);
}
.env-decouple-card.social {
  border-top: 3px solid #ef4444;
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.5) 0%, rgba(255, 255, 255, 0.9) 100%);
}
.env-decouple-header h3 {
  margin: 6px 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.env-decouple-header p {
  margin: 0 0 12px;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.45;
}
.ed-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ed-tag {
  font-size: 11px;
  font-weight: 700;
}
.ed-tag.natural { color: #059669; }
.ed-tag.social { color: #dc2626; }
.env-decouple-factors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ed-factor-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.ed-factor-item strong {
  display: block;
  font-size: 12px;
  color: #1e293b;
  margin-bottom: 2px;
}
.ed-factor-item p {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.45;
}
.topo-embed-box {
  margin-top: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
</style>
