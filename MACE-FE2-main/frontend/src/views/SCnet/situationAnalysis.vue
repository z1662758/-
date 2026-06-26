<template>
  <!-- 第一步：场景设定 -->
  <div v-if="step === 'setup'" class="scenario-setup-page">
    <button class="back-btn-3d" @click="goBackToPhaseSelection">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span class="back-btn-text">返回选择</span>
    </button>

    <div class="scenario-dialog">
      <div class="initial-history-btn" @click="showPresetDialog = true" title="加载场景预设">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>场景预设</span>
      </div>

      <div class="scenario-page-header">
        <div class="dialog-icon">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
            <rect x="4" y="10" width="40" height="28" rx="4" fill="#1e3a5f" stroke="#4facfe" stroke-width="1.5"/>
            <rect x="10" y="16" width="10" height="10" rx="1" fill="#4facfe" opacity="0.8"/>
            <rect x="24" y="16" width="14" height="3" rx="1" fill="#4facfe" opacity="0.5"/>
            <rect x="24" y="21" width="10" height="3" rx="1" fill="#4facfe" opacity="0.3"/>
            <path d="M10 30 L20 30 M10 33 L16 33" stroke="#4facfe" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
          </svg>
        </div>
        <p class="header-subtitle">请完成以下设定</p>
      </div>

      <div class="scenario-setup-content">
        <div class="setup-section">
          <div class="section-header">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>场景设定</span>
          </div>

          <div class="setup-item">
            <div class="item-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
              <span>目标企业</span>
              <span class="item-desc">选择供应链研究的核心企业</span>
            </div>

            <div class="company-selector-grid">
              <div
                v-for="company in companyOptions"
                :key="company.id"
                class="company-card"
                :class="{ selected: scenarioData.targetCompany === company.id }"
                @click="scenarioData.targetCompany = company.id"
              >
                <div class="company-logo">{{ company.logo }}</div>
                <div class="company-info">
                  <div class="company-name">{{ company.name }}</div>
                  <div class="company-type">{{ company.type }}</div>
                </div>
                <div class="company-check" v-if="scenarioData.targetCompany === company.id">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="setup-item">
            <div class="item-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>供应链背景设定</span>
            </div>
            <textarea
              v-model="scenarioData.historicalBackground"
              rows="3"
              placeholder="请描述铀供应链背景，例如：中国核电装机约55GW，年天然铀需求约10,000+ tU，国内产量仅约1,500-2,000 tU/年，缺口依赖哈萨克斯坦/纳米比亚/尼日尔海外权益矿和现货采购..."
              class="setup-textarea"
            />
          </div>

          <div class="setup-item">
            <div class="item-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>触发事件设定</span>
            </div>
            <textarea
              v-model="scenarioData.initialEvent"
              rows="3"
              placeholder="请描述供应链中断或关键事件，例如：核心芯片供应商因地缘政治摩擦宣布断供..."
              class="setup-textarea"
            />
          </div>
        </div>

        <div class="setup-section" v-if="selectedPhase === 'during'">
          <div class="section-header during">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>供应链当前状态</span>
          </div>
          <div class="setup-item">
            <textarea
              v-model="scenarioData.currentProgress"
              rows="4"
              placeholder="请描述当前供应链状态..."
              class="setup-textarea"
            />
          </div>
        </div>

        <div class="setup-section" v-if="selectedPhase === 'post'">
          <div class="section-header post">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>事件完整时间线</span>
          </div>
          <div class="setup-item">
            <textarea
              v-model="scenarioData.completeTimeline"
              rows="5"
              placeholder="请描述事件完整时间线..."
              class="setup-textarea"
            />
          </div>
        </div>
      </div>

      <div class="scenario-action-buttons">
        <button class="save-scenario-btn" @click="submitScenarioSetup">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>完成场景设定</span>
        </button>
      </div>
    </div>

    <el-dialog v-model="showPresetDialog" title="场景预设" width="550px" :modal="true" append-to-body>
      <div class="preset-save-section">
        <div class="preset-save-header">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span>保存当前场景为预设</span>
        </div>

        <div class="preset-save-form">
          <el-input v-model="newPresetName" placeholder="输入预设名称" size="small" style="width: 200px;" />
          <el-input v-model="newPresetDesc" placeholder="输入预设描述（可选）" size="small" style="width: 200px;" />
          <el-button type="primary" size="small" @click="saveCurrentAsPreset" :disabled="!newPresetName.trim()">
            <el-icon><Plus /></el-icon>
            保存
          </el-button>
        </div>
      </div>

      <el-divider style="margin: 16px 0;">
        <span style="color: #909399; font-size: 12px;">选择预设场景</span>
      </el-divider>

      <div class="preset-list">
        <div
          v-for="preset in allPresets"
          :key="preset.id"
          class="preset-card"
          :class="{ active: selectedPreset === preset.id }"
          @click="selectPreset(preset.id)"
        >
          <div class="preset-card-header">
            <span class="preset-card-name">{{ preset.name }}</span>

            <div class="preset-card-actions">
              <svg
                v-if="selectedPreset === preset.id"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="#409eff"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12"/>
              </svg>

              <svg
                v-if="preset.id.startsWith('user_')"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="#f56c6c"
                stroke-width="2"
                class="delete-icon"
                @click.stop="deleteUserPreset(preset.id)"
              >
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
          </div>

          <div class="preset-card-desc">{{ preset.description || '暂无描述' }}</div>
          <div class="preset-card-location">{{ preset.company || '未知企业' }}</div>
        </div>

        <div v-if="allPresets.length === 0" class="preset-empty">
          暂无预设，请先保存当前场景
        </div>
      </div>

      <template #footer>
        <el-button @click="showPresetDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmPreset" :disabled="!selectedPreset">确认加载</el-button>
      </template>
    </el-dialog>
  </div>

  <!-- 第二步：可视化报告页 -->
  <ScenarioReport
    v-if="step === 'report'"
    :scenario-data="scenarioData"
    :selected-phase="selectedPhase"
    @back="backToSetup"
  />
</template>

<script>
import { ElNotification } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import ScenarioReport from './ScenarioReport.vue'

export default {
  name: 'ScenarioModeling',

  components: {
    Plus,
    ScenarioReport
  },

  data() {
    return {
      step: 'setup',
      selectedPhase: null,

      showPresetDialog: false,
      selectedPreset: '',
      newPresetName: '',
      newPresetDesc: '',
      userScenarioPresets: [],

      scenarioData: {
        targetCompany: 'cnnc',
        historicalBackground: '中国是全球最大的铀消费国之一，年核电需求约10,000+ tU。国内产量有限（约1,500-2,000 tU/年），高度依赖海外权益矿（尼日尔/纳米比亚/哈萨克斯坦）和国际贸易...',
        initialEvent: '尼日尔2023年政变后局势持续不稳，2024年Imouraren开采许可被撤销、Madaouela采矿权被撤回，严重冲击中国在尼日尔的铀矿权益...',
        currentProgress: '',
        completeTimeline: ''
      },

      companyOptions: [
        { id: 'sinopec', name: '中石化', logo: '⛽', type: '国有炼化一体化' },
        { id: 'petrochina', name: '中石油', logo: '🛢️', type: '国有上游+炼化' },
        { id: 'cnOOC', name: '中海油', logo: '🌊', type: '国有海上勘探开发' },
        { id: 'hengli', name: '恒力石化', logo: '🏭', type: '民营炼化' },
        { id: 'rongSheng', name: '荣盛石化', logo: '🔬', type: '民营炼化一体化' }
      ],

      scenarioPresets: [
        {
          id: 'niger_coup',
          name: '尼日尔政变矿权危机',
          description: '尼日尔政变后Imouraren/Madaouela矿权撤销，冲击全球铀供应',
          company: '中核集团',
          historicalBackground: '2023年7月尼日尔政变，军政府重新审查外资矿业合同。2024年6月撤销Orano对Imouraren开采许可，7月撤回GoviEx的Madaouela采矿权。尼日尔是欧盟第三大铀来源，也是中国海外权益铀布局的重要节点。',
          initialEvent: '2024年Q3，尼日尔军政府宣布对外资矿权全面重审，仅存的Somair矿业面临不确定前景。U3O8现货价从$85/lb跳涨至$105/lb，EU电力公司紧急寻求哈萨克斯坦、加拿大替代供应。'
        },
        {
          id: 'kazakh_acid',
          name: '哈萨克斯坦硫酸短缺',
          description: '硫酸供应不足制约ISL地浸产量，Kazatomprom下调产量指引',
          company: '中广核',
          historicalBackground: '哈萨克斯坦贡献全球40%+铀产量，以ISL地浸为主。ISL生产需大量硫酸作浸出剂。2024年1月Kazatomprom因硫酸短缺下调产量预期，且2025年恢复满产计划也受此影响。',
          initialEvent: '2024年Q2，Kazatomprom再次因硫酸供应不稳定下调年度产量指引约10%，全球铀供给预期减少2,000-3,000 tU。U3O8现货价单周上涨$12/lb，买方加速长协锁量。'
        },
        {
          id: 'mcarthur_restart',
          name: 'McArthur River重启爬坡',
          description: 'Cameco McArthur River/Key Lake停产4年后重启，2024-2025年逐步爬坡满产',
          company: 'Cameco',
          historicalBackground: '2018年因铀价低迷，Cameco将McArthur River/Key Lake（设计产能1,800万磅U3O8/年）停产维护。2022年11月重启，2024-2025年逐步恢复满产。停产期间Cameco被迫从市场采购铀来履行长协。',
          initialEvent: '2024年Q3，McArthur River爬坡至设计产能的75%，但地下开采面品位恢复慢于预期。Cameco暗示2025年上半年才能达到满产，比此前指引晚6个月。'
        }
      ]
    }
  },

  computed: {
    allPresets() {
      return [...this.scenarioPresets, ...this.userScenarioPresets]
    }
  },

  mounted() {
    const phase = localStorage.getItem('scnet_phaseSelection')
    this.selectedPhase = phase || 'pre'
  },

  methods: {
    goBackToPhaseSelection() {
      this.$router.push('/home/SCnet/total')
    },

    submitScenarioSetup() {
      this.showPresetDialog = false
      document.body.style.overflow = ''
      this.step = 'report'
    },

    backToSetup() {
      this.step = 'setup'
    },

    selectPreset(id) {
      this.selectedPreset = id
    },

    confirmPreset() {
      const preset = this.allPresets.find(p => p.id === this.selectedPreset)

      if (preset) {
        const match = this.companyOptions.find(c => c.name === preset.company)

        if (match) {
          this.scenarioData.targetCompany = match.id
        }

        this.scenarioData.historicalBackground = preset.historicalBackground || ''
        this.scenarioData.initialEvent = preset.initialEvent || ''
        this.showPresetDialog = false

        ElNotification({
          title: '加载成功',
          message: `已加载场景预设：${preset.name}`,
          type: 'success'
        })
      }
    },

    saveCurrentAsPreset() {
      const company = this.companyOptions.find(c => c.id === this.scenarioData.targetCompany)

      this.userScenarioPresets.push({
        id: `user_${Date.now()}`,
        name: this.newPresetName.trim(),
        description: this.newPresetDesc.trim(),
        company: company?.name || '比亚迪',
        historicalBackground: this.scenarioData.historicalBackground,
        initialEvent: this.scenarioData.initialEvent
      })

      ElNotification({
        title: '成功',
        message: '预设已保存',
        type: 'success'
      })

      this.newPresetName = ''
      this.newPresetDesc = ''
      this.showPresetDialog = false
    },

    deleteUserPreset(id) {
      const idx = this.userScenarioPresets.findIndex(p => p.id === id)

      if (idx !== -1) {
        this.userScenarioPresets.splice(idx, 1)
      }

      if (this.selectedPreset === id) {
        this.selectedPreset = ''
      }
    }
  }
}
</script>

<style scoped>
.scenario-setup-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  justify-content: center;
  padding: 60px 20px 40px;
  box-sizing: border-box;
}

.scenario-dialog {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  padding: 32px;
  position: relative;
  box-sizing: border-box;
}

.back-btn-3d {
  position: fixed;
  top: 72px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  z-index: 100;
}

.back-btn-3d:hover {
  background: #f0f7ff;
  border-color: #409eff;
  color: #409eff;
}

.initial-history-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #f0f7ff;
  border: 1px solid #c6e2ff;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #409eff;
}

.initial-history-btn svg {
  width: 16px;
  height: 16px;
}

.scenario-page-header {
  text-align: center;
  margin-bottom: 28px;
}

.dialog-icon {
  display: inline-flex;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #e8f4ff 0%, #d6eaff 100%);
  border-radius: 16px;
  margin-bottom: 12px;
  justify-content: center;
  align-items: center;
}

.header-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.scenario-setup-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-section {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.section-header.during {
  color: #e6a23c;
}

.section-header.post {
  color: #67c23a;
}

.setup-item {
  margin-bottom: 16px;
}

.setup-item:last-child {
  margin-bottom: 0;
}

.item-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.item-desc {
  font-size: 12px;
  color: #c0c4cc;
  margin-left: 4px;
}

.setup-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.setup-textarea:focus {
  border-color: #409eff;
  outline: none;
}

.company-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.company-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  position: relative;
}

.company-card:hover {
  border-color: #c6e2ff;
  background: #f8fbff;
}

.company-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.company-logo {
  font-size: 22px;
}

.company-info {
  flex: 1;
}

.company-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.company-type {
  font-size: 11px;
  color: #909399;
}

.company-check {
  color: #409eff;
}

.scenario-action-buttons {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.save-scenario-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 40px;
  background: linear-gradient(135deg, #409eff 0%, #3375c9 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-scenario-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

.preset-save-section {
  margin-bottom: 12px;
}

.preset-save-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;
}

.preset-save-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-list {
  max-height: 320px;
  overflow-y: auto;
}

.preset-card {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: #c6e2ff;
  background: #f0f7ff;
}

.preset-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.preset-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.preset-card-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.preset-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-icon {
  cursor: pointer;
}

.preset-card-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.preset-card-location {
  font-size: 12px;
  color: #409eff;
}

.preset-empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 24px 0;
}

@media (max-width: 800px) {
  .scenario-setup-page {
    padding: 70px 12px 30px;
  }

  .scenario-dialog {
    padding: 24px 16px;
  }

  .initial-history-btn {
    position: static;
    width: fit-content;
    margin-left: auto;
    margin-bottom: 16px;
  }

  .back-btn-3d {
    top: 20px;
    left: 12px;
  }

  .company-selector-grid {
    grid-template-columns: 1fr;
  }

  .preset-save-form {
    flex-direction: column;
  }
}
</style>
