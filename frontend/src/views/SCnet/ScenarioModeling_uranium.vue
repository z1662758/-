<template>
  <div class="scenario-modeling-root">
    <!-- 全局隐藏文件上传输入框（始终可用） -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept=".pdf"
      @change="handleFileChange"
    />
    <!-- 需求输入（居中对话框） -->
    <div class="initial-dialog-overlay">
      <div class="particles">
        <div class="particle" v-for="i in 20" :key="i" :style="getParticleStyle(i)"></div>
      </div>

      <div class="initial-dialog">
        <div class="dialog-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </div>
        <h2>推演需求设定</h2>
        <p>输入突发供需变化或保供调度需求，系统将自动分解推演任务</p>

        <div class="initial-input-container">
          <div class="input-wrapper">
            <input
              v-model="inputMessage"
              @keyup.enter="startAnalysis"
              placeholder="例如：新增4台华龙一号机组提前装料（年需约1,600 tU），中哈长协与国内储备如何调度？"
              class="initial-message-input"
              :disabled="isProcessing"
              ref="initialInput"
            />
            <div class="input-border"></div>
          </div>

          <div class="initial-actions">
            <div class="initial-actions-left">
              <el-tooltip content="上传 PDF 文档作为补充输入" placement="top" effect="light">
                <el-button circle text @click="triggerFileUpload" :disabled="isProcessing">
                  <el-icon><Plus/></el-icon>
                </el-button>
              </el-tooltip>
              <el-tag v-if="selectedFile" type="primary" round closable @close="selectedFile = null">
                {{ selectedFile.name }}
              </el-tag>
            </div>

            <div class="initial-actions-right">
              <el-dropdown @command="handleModelChange" trigger="click">
                <el-button text>
                  <span class="model-name">{{ selectedModelLabel }}</span>
                  <el-icon class="el-icon--right"><ArrowDown/></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="opt in modelOptions"
                      :key="opt.value"
                      :command="opt.value"
                      :disabled="opt.disabled"
                    >{{ opt.label }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                circle
                :type="inputMessage.trim() ? 'primary' : 'default'"
                :disabled="isProcessing || !inputMessage.trim()"
                @click="startAnalysis"
              >
                <el-icon v-if="!isProcessing"><Position/></el-icon>
                <el-icon v-else class="is-loading"><Loading/></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 典型地缘断供预设想定库 (主推俄乌冲突场景) -->
        <div class="preset-scenarios-container">
          <div class="preset-scenarios-head">
            <span>⚡ 典型地缘冲突与保供冲击想定（一键载入）</span>
            <small>预置参数与扰动事件已与推演内核对齐</small>
          </div>
          <div class="preset-cards-grid">
            <div
              v-for="preset in presetScenarios"
              :key="preset.id"
              class="preset-card"
              :class="{ 'is-featured': preset.isFeatured, 'is-active': activePresetId === preset.id }"
              @click="applyPresetScenario(preset)"
            >
              <div class="preset-card-top">
                <span class="preset-icon">{{ preset.icon }}</span>
                <el-tag v-if="preset.badge" :type="preset.badgeType" size="small" effect="dark" round>
                  {{ preset.badge }}
                </el-tag>
              </div>
              <strong class="preset-title">{{ preset.title }}</strong>
              <p class="preset-desc">{{ preset.desc }}</p>
              <div class="preset-tags">
                <span v-for="tag in preset.tags" :key="tag" class="preset-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 需求不完整时的内联提示（拆分两步后,这里直接给反馈,不再切到聊天面板） -->
        <el-alert
          v-if="judgementError"
          class="judgement-inline-alert"
          :title="judgementError.title"
          type="warning"
          show-icon
          :closable="false"
        >
          <template #default>
            <div class="judgement-inline-content" v-html="judgementError.html"></div>
          </template>
        </el-alert>

        <div v-if="isProcessing" class="initial-loading">
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <p>正在判断需求合法性...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ScenarioModelingLogic from './Js/ScenarioModelingLogic_uranium.js'
import { useScnetSupplyChainStore as useSupplyChainStore } from '@/stores/scnet'
import { storeToRefs } from 'pinia'
import { SCNET_ROUTES } from '@/constants/scnetRoutes'
import { readScnetPhase } from '@/constants/scnetPhase'
import {
  Plus, ArrowDown, Position, Loading
} from '@element-plus/icons-vue'

export default {
  ...ScenarioModelingLogic,
  components: {
    Plus, ArrowDown, Position, Loading
  },
  setup() {
    const store = useSupplyChainStore()
    const { chatHistory, goalDecompositionLog, loading, scenarioContext } = storeToRefs(store)

    return {
      store,
      chatHistory,
      goalDecompositionLog,
      storeLoading: loading,
      scenarioContext
    }
  },
  computed: {
    ...(ScenarioModelingLogic.computed || {}),
    selectedModelLabel() {
      const opt = this.modelOptions.find(o => o.value === this.selectedModel)
      return opt ? opt.label : this.selectedModel
    }
  },
  data() {
    return {
      ...ScenarioModelingLogic.data(),
      judgementError: null,
      selectedModel: 'qwen-turbo',
      modelOptions: [
        { label: 'Qwen-Turbo（推荐）', value: 'qwen-turbo', disabled: false },
        { label: 'Qwen-Plus（均衡）', value: 'qwen-plus', disabled: false },
        { label: 'Qwen-Max（较慢）', value: 'qwen-max', disabled: false },
        { label: 'DeepSeek-Chat', value: 'deepseek', disabled: false },
        { label: 'GLM-4-Flash（智谱）', value: 'glm', disabled: false },
        { label: 'Kimi-K2', value: 'kimi', disabled: false }
      ],
      selectedPhase: 'during',
      activePresetId: 'ukraine-war',
      presetScenarios: [
        {
          id: 'ukraine-war',
          title: '俄乌冲突与西方禁俄铀法案 (2022–2028)',
          desc: '俄44%浓缩产能受制裁脱钩，国际现货暴涨至 $106/lb，黑海通道阻断，华龙一号提前装料保供。',
          prompt: '俄乌冲突爆发及西方禁俄铀法案生效背景下，国际现货暴涨至 $106/lb，黑海与欧洲航道阻断，国内新增 4 台华龙一号机组提前装料（年需约 1,600 tU），如何协同中哈铁路与国家战略储备开展应急保供调度？',
          icon: '⚔️',
          badge: '主推想定',
          badgeType: 'danger',
          isFeatured: true,
          tags: ['现货 $106/lb', '物流风险 +0.40', '装料 1,600 tU']
        },
        {
          id: 'rail-shock',
          title: '中哈阿拉山口铁路口岸中断 30 天',
          desc: '极寒暴雪与边境车皮积压导致陆路班列停运，北方包头基地库存骤降至 14 周预警线。',
          prompt: '中哈边境阿拉山口铁路口岸突发极端暴雪停运 30 天，北方包头燃料元件基地可用库存降至 14 周，如何启动南向海运分流与跨基地调剂？',
          icon: '❄️',
          badge: '陆运断链',
          badgeType: 'warning',
          isFeatured: false,
          tags: ['陆运中断 30天', '北方缺口 1,380 tU', '库存 14周']
        },
        {
          id: 'sea-shock',
          title: '海运通道受阻与现货高溢价冲击',
          desc: '红海与好望角远洋航线保险与转运费率上涨，南方沿海基地大修换料窗口面临交货延期。',
          prompt: '纳米比亚至中国海运通道受地缘冲突波及，运费上涨 35% 且到岸延期 25 天，如何优化国内战略保税库借调与长协刚性履约？',
          icon: '🌊',
          badge: '海运扰动',
          badgeType: 'primary',
          isFeatured: false,
          tags: ['海运到岸 +25天', '运费 +35%', '保税库借调']
        }
      ],
      phases: [
        { value: 'pre',  label: '事前', icon: '📊', description: '铀网络设计、供给规划、制造节点布局策略' },
        { value: 'during',  label: '事中', icon: '🚨', description: '供给调度优化、节点协同、库存动态管理' },
        { value: 'post', label: '事后', icon: '📈', description: '协同网络评估、成本分析、策略复盘' }
      ]
    }
  },
  methods: {
    ...ScenarioModelingLogic.methods,
    handleModelChange(value) {
      this.selectedModel = value
    },
    applyPresetScenario(preset) {
      this.activePresetId = preset.id
      this.inputMessage = preset.prompt
      this.selectedPhase = 'during'
      this.$nextTick(() => {
        if (this.$refs.initialInput) {
          this.$refs.initialInput.focus()
        }
      })
    },
    /**
     * 重写需求判断成功的回调：
     *  - 合法 (flag=1)：跳转到「对话分析」页继续拆解
     *  - 不合法 (flag=0)：在本页内联展示缺失要素提示，等待用户修改后重提
     */
    handleJudgementSuccess(result) {
      this.judgementResult = result
      const sid = result?.session_id || this.sessionId
      this.sessionId = sid
      this.isRequirementLegal = result.flag === 1

      if (this.store && this.sessionId) {
        this.store.commitStepResult('goal-input', {
          sessionId: this.sessionId,
          userGoal: this.inputMessage,
          requirementMeta: {
            goal: result.goal || '',
            variable: result.variable || '',
            object: result.object || '',
            is_legal: result.flag === 1,
            analysis_phase: this.selectedPhase || '',
            raw_input: this.inputMessage,
            model_name: this.selectedModel || 'qwen-turbo'
          }
        })
        if (this.store.scenarioContext) {
          this.store.setScenarioContext(this.store.scenarioContext)
        }
      }

      if (result.flag === 1) {
        this.requirementElements = {
          goal: result.goal,
          variable: result.variable,
          object: result.object
        }
        this.judgementError = null
        this.isProcessing = false
        this.$router.push({ path: SCNET_ROUTES.scenarioAnalysis, query: { fresh: '1' } })
      } else {
        const varText = Array.isArray(result.variable) ? result.variable.join('、') : (result.variable || '')
        const missing = []
        if (!result.goal) missing.push('研究目标')
        if (!varText) missing.push('核心变量')
        if (!result.object) missing.push('作用对象')
        const tip = result.content ? this._escapeHtml(result.content) : '请明确描述研究目标、核心变量以及作用对象'
        this.judgementError = {
          title: '需求不完整，请补充缺失要素后重新提交',
          html: `
            <div class="judgement-missing-list">${
              missing.length
                ? `缺失要素：<strong>${missing.join('、')}</strong>`
                : ''
            }</div>
            <div class="judgement-tip-text">💡 ${tip}</div>
          `
        }
        this.isProcessing = false
      }
    },
    async startAnalysis() {
      this.judgementError = null
      if (!this.inputMessage.trim() || this.isProcessing) return

      this.isProcessing = true
      this.agentDesignSynced = false
      this.agentDesignSyncError = ''

      try {
        await this.ensureSessionId(this.inputMessage.trim(), { forceNew: true })

        if (this.store && this.sessionId) {
          this.store.commitStepResult('goal-input', {
            sessionId: this.sessionId,
            userGoal: this.inputMessage,
            requirementMeta: {
              analysis_phase: this.selectedPhase || 'during',
              raw_input: this.inputMessage,
              model_name: this.selectedModel || 'qwen-turbo',
              is_legal: false
            }
          })
          if (this.store.scenarioContext) {
            this.store.setScenarioContext(this.store.scenarioContext)
          }
        }

        this.$router.push({ path: SCNET_ROUTES.scenarioAnalysis, query: { fresh: '1' } })
      } catch (error) {
        this.handleApiError(error, '创建会话')
      } finally {
        this.isProcessing = false
      }
    }
  },
  mounted() {
    const storedPhase = readScnetPhase('')
    if (storedPhase === 'pre' || storedPhase === 'during' || storedPhase === 'post') {
      this.selectedPhase = storedPhase
    }
    this.$nextTick(() => {
      if (this.$refs.initialInput) {
        this.$refs.initialInput.focus()
      }
    })
  }
}
</script>

<style scoped src="./Css/ScenarioModeling.css"></style>

<style scoped>
.judgement-inline-alert {
  margin-top: 16px;
  border-radius: 10px;
}
.judgement-inline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.judgement-inline-content :deep(.judgement-missing-list) {
  color: #b45309;
}
.judgement-inline-content :deep(.judgement-tip-text) {
  color: #475569;
}

/* 预设想定选择区 */
.preset-scenarios-container {
  margin-top: 24px;
  width: 100%;
  text-align: left;
}
.preset-scenarios-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}
.preset-scenarios-head small {
  font-size: 11px;
  font-weight: 400;
  color: #64748b;
}
.preset-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.preset-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}
.preset-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
}
.preset-card.is-featured {
  border-color: #fca5a5;
  background: linear-gradient(to bottom, #fff5f5, #ffffff);
}
.preset-card.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
.preset-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.preset-icon {
  font-size: 18px;
}
.preset-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}
.preset-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
  padding-top: 6px;
}
.preset-tag {
  font-size: 10px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}
@media (max-width: 768px) {
  .preset-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
