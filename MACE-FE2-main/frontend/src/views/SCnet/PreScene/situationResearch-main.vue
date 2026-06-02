<template>
  <div class="combined-prediction">

    <!-- ── 分析前置：问题设定配置 ─────────────────────────────── -->
    <div class="gov-panel" :class="{ 'gov-collapsed': govCollapsed }">
      <div class="gov-header" @click="govCollapsed = !govCollapsed">
        <div class="gov-header-left">
          <span class="gov-status-dot" :class="govStatusClass"></span>
          <span class="gov-title">分析前置 · 汽车供应链问题设定</span>
          <span class="gov-phase-tag">{{ activeTabLabel }}</span>
        </div>
        <div class="gov-header-right">
          <template v-if="govCollapsed">
            <span class="gov-mandate-chip">{{ selectedMandateLabel }}</span>
            <span class="gov-domain-summary">{{ activeDomainCount }} 个数据域 · 均质 {{ avgDomainQuality }}%</span>
          </template>
          <svg class="gov-chevron" :class="{ rotated: !govCollapsed }" width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
      </div>

      <transition name="gov-slide">
        <div v-show="!govCollapsed" class="gov-body">
          <div class="gov-grid">

            <!-- 分析议题锁定 -->
            <div class="gov-col">
              <div class="gov-col-header">分析议题锁定</div>
              <div class="mandate-list">
                <div
                  v-for="opt in currentGovConfig.mandateOptions"
                  :key="opt.value"
                  class="mandate-item"
                  :class="{ active: selectedMandates[activeKey] === opt.value }"
                  @click="selectedMandates[activeKey] = opt.value"
                >
                  <span class="mandate-radio" :class="{ active: selectedMandates[activeKey] === opt.value }"></span>
                  <div class="mandate-text">
                    <div class="mandate-label">{{ opt.label }}</div>
                    <div class="mandate-desc">{{ opt.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 数据域覆盖配置 -->
            <div class="gov-col">
              <div class="gov-col-header">供应链数据域覆盖</div>
              <div class="domain-list">
                <div
                  v-for="domain in currentGovConfig.dataDomains"
                  :key="domain.id"
                  class="domain-row"
                  :class="{ 'domain-off': !isDomainEnabled(domain.id) }"
                  @click="toggleDomain(domain.id)"
                >
                  <span class="domain-check" :class="{ active: isDomainEnabled(domain.id) }">
                    <svg v-if="isDomainEnabled(domain.id)" width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    </svg>
                  </span>

                  <div class="domain-info">
                    <div class="domain-name">{{ domain.label }}</div>
                    <div class="domain-coverage">{{ domain.coverage }}</div>
                  </div>

                  <div class="domain-q-wrap">
                    <div class="domain-q-bar">
                      <div
                        class="domain-q-fill"
                        :style="{ width: domain.quality + '%', background: qualityColor(domain.quality) }"
                      ></div>
                    </div>
                    <span class="domain-q-val" :style="{ color: qualityColor(domain.quality) }">{{ domain.quality }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分析基线假设 -->
            <div class="gov-col">
              <div class="gov-col-header">分析基线假设</div>
              <div class="assume-list">
                <div v-for="(a, i) in currentGovConfig.assumptions" :key="i" class="assume-item">
                  <span class="assume-index">{{ i + 1 }}</span>
                  <span class="assume-text">{{ a }}</span>
                </div>
              </div>

              <div class="gov-time-range">
                <span class="gov-time-label">时间基准</span>
                <span class="gov-time-val">{{ currentGovConfig.timeRange }}</span>
              </div>
            </div>

          </div>
        </div>
      </transition>
    </div>
    <!-- ── /问题设定配置 ────────────────────────────────────── -->

    <!-- 分析模块切换 -->
    <div class="switch-shell">
      <div class="switch-title-wrap">
        <div class="switch-title">汽车供应链态势预测引擎</div>
        <div class="switch-subtitle">趋势、周期、拐点三模块统一视图</div>
      </div>

      <el-radio-group v-model="activeKey" class="switch-group" @change="onTabSwitch">
        <el-radio-button label="trend">趋势预测</el-radio-button>
        <el-radio-button label="cycle">周期分析</el-radio-button>
        <el-radio-button label="turning">拐点识别</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 当前问题摘要 -->
    <div class="problem-brief-shell">
      <div class="problem-brief-card primary">
        <div class="problem-brief-label">当前问题设定</div>
        <div class="problem-brief-title">{{ analysisContext.mandate.label }}</div>
        <div class="problem-brief-text">{{ analysisContext.mandate.desc }}</div>
      </div>

      <div class="problem-brief-card">
        <div class="problem-brief-label">证据覆盖</div>
        <div class="problem-brief-title">
          {{ analysisContext.activeDomains.length }} 个数据域 · 均质 {{ analysisContext.avgQuality }}%
        </div>
        <div class="problem-brief-text">{{ analysisContext.domainSummary }}</div>
      </div>

      <div class="problem-brief-card">
        <div class="problem-brief-label">输出导向</div>
        <div class="problem-brief-title">{{ analysisContext.outputTitle }}</div>
        <div class="problem-brief-text">{{ analysisContext.outputHint }}</div>
      </div>
    </div>

    <div class="pane-container">
      <TrendPrediction v-if="activeKey === 'trend'" :analysis-context="analysisContext" />
      <CyclePrediction v-else-if="activeKey === 'cycle'" :analysis-context="analysisContext" />
      <TurningPointPrediction v-else-if="activeKey === 'turning'" :analysis-context="analysisContext" />
    </div>
  </div>
</template>

<script>
import TrendPrediction from './TrendPrediction.vue'
import CyclePrediction from './CyclePrediction.vue'
import TurningPointPrediction from './TurningPointPrediction.vue'

const GOVERNANCE_CONFIG = {
  trend: {
    mandateOptions: [
      {
        value: 'component_pressure',
        label: '关键零部件供给压力预判',
        desc: '识别车规芯片、功率器件、传感器、线束等关键零部件未来数月的交付压力变化。'
      },
      {
        value: 'battery_cost',
        label: '动力电池成本趋势评估',
        desc: '跟踪锂、镍、钴、磷酸铁锂、电芯与Pack成本变化，判断电池成本对整车利润和定价空间的影响。'
      },
      {
        value: 'inventory_balance',
        label: '整车库存与渠道压力预测',
        desc: '观察主机厂库存、经销商库存、库存天数和终端折扣，判断库存压力是否继续抬升。'
      },
      {
        value: 'logistics_delay',
        label: '跨境物流延误趋势监测',
        desc: '监测港口拥堵、海运周期、关务扰动和零部件到厂准时率，预判物流瓶颈对排产的影响。'
      }
    ],
    dataDomains: [
      { id: 'chip_supply', label: '车规芯片交期', quality: 86, coverage: '2024.01 – 2025.12 · MCU/功率器件/座舱芯片' },
      { id: 'battery_material', label: '动力电池材料价格', quality: 88, coverage: '2024.01 – 2025.12 · 锂/镍/钴/磷酸铁锂' },
      { id: 'vehicle_inventory', label: '整车库存水位', quality: 78, coverage: '2024.01 – 2025.12 · 库存天数/周转率/渠道折扣' },
      { id: 'logistics_delivery', label: '物流交付时效', quality: 72, coverage: '2024.01 – 2025.12 · 港口/海运/铁路/到厂准时率' }
    ],
    assumptions: [
      '车规半导体整体供给较前期改善，但高端MCU、功率器件和智能驾驶芯片仍可能存在结构性紧张',
      '动力电池材料价格处于相对低位，短期不预设大幅反弹，但关注成本降幅收窄',
      '整车库存处于中高位区间，终端需求恢复速度决定后续是补库还是去库'
    ],
    timeRange: '2024.01 – 2025.12（供应链运行基准）+ 未来6个月预测窗口'
  },

  cycle: {
    mandateOptions: [
      {
        value: 'supply_demand',
        label: '供需关系周期分析',
        desc: '综合终端需求、整车库存、主机厂排产和关键零部件供给能力，判断当前处于供不应求、供需平衡还是供过于求阶段。'
      },
      {
        value: 'inventory_cycle',
        label: '补库/去库周期识别',
        desc: '提取渠道库存、工厂库存和零部件备货的周期性规律，判断当前处于主动补库、被动累库还是去库调整。'
      },
      {
        value: 'production_rhythm',
        label: '主机厂排产节律分析',
        desc: '观察月度排产、产能利用率、车型切换和节假日因素，识别排产节奏对供应链需求的影响。'
      },
      {
        value: 'material_price_cycle',
        label: '原材料价格周期判断',
        desc: '围绕锂、镍、钢、铝、橡胶等关键投入品，研判成本周期对采购锁价和备货节奏的影响。'
      }
    ],
    dataDomains: [
      { id: 'terminal_demand', label: '终端需求与订单', quality: 84, coverage: '2020.01 – 2025.12 · 订单/销量/门店线索' },
      { id: 'channel_inventory', label: '渠道库存周期', quality: 80, coverage: '2020.01 – 2025.12 · 库存天数/周转率' },
      { id: 'production_plan', label: '主机厂排产计划', quality: 76, coverage: '2023.01 – 2025.12 · 月度排产/产能利用率' },
      { id: 'supplier_capacity', label: '供应商产能响应', quality: 74, coverage: '2023.01 – 2025.12 · Tier1/Tier2交付能力' }
    ],
    assumptions: [
      '终端需求、排产节奏和库存水位之间存在滞后关系，通常需求变化领先排产调整1–2个月',
      '新能源车型迭代速度维持高位，部分零部件需求会因平台切换出现阶段性跳变',
      '若出现重大关税、出口限制或质量召回事件，周期模型需要切换为外部冲击场景'
    ],
    timeRange: '2020.01 – 2025.12（供需周期基准）+ 未来12个月预测窗口'
  },

  turning: {
    mandateOptions: [
      {
        value: 'shortage_turning',
        label: '供应短缺拐点识别',
        desc: '识别芯片、电池、热管理、线束等环节从可控紧张转为断供风险的信号组合。'
      },
      {
        value: 'cost_rebound',
        label: '成本反弹拐点预警',
        desc: '捕捉电池材料、金属、能源和运价等成本因子的快速反弹信号，评估对整车毛利的冲击。'
      },
      {
        value: 'inventory_overhang',
        label: '库存积压拐点判断',
        desc: '判断库存水位是否从合理备货转向渠道压库，并识别可能触发降价促销或减产的阈值。'
      },
      {
        value: 'supplier_break',
        label: '核心供应商断点风险评估',
        desc: '监测单一供应商依赖、财务承压、质量事故和地缘扰动，判断供应链断点风险。'
      }
    ],
    dataDomains: [
      { id: 'supplier_health', label: '核心供应商健康度', quality: 82, coverage: '2024.01 – 2025.12 · 交付/财务/质量' },
      { id: 'shortage_signal', label: '短缺预警信号', quality: 85, coverage: '2024.01 – 2025.12 · 交期/报价/库存' },
      { id: 'cost_signal', label: '成本波动信号', quality: 81, coverage: '2024.01 – 2025.12 · 材料/能源/运价' },
      { id: 'inventory_alert', label: '库存压力信号', quality: 76, coverage: '2024.01 – 2025.12 · 库存天数/折扣/周转' }
    ],
    assumptions: [
      '核心供应商短期内不发生大规模停产，但局部交付延迟仍可能影响重点车型排产',
      '库存风险通常领先价格促销与产量调整出现，可通过库存天数、折扣率和动销速度提前识别',
      '若材料价格连续上行并叠加物流扰动，成本反弹可能从单点压力扩散为整车毛利压力'
    ],
    timeRange: '2024.01 – 2025.12（高频信号采集）+ 未来3个月拐点窗口'
  }
}

const OUTPUT_HINT_MAP = {
  trend: {
    component_pressure: {
      title: '供给压力前置预警',
      hint: '后续趋势曲线将重点展示关键零部件交期、缺口、安全库存和到厂准时率，判断哪些物料可能拖累排产。'
    },
    battery_cost: {
      title: '电池成本趋势研判',
      hint: '后续分析会强化电芯、材料和Pack成本曲线，输出采购锁价、车型定价和毛利压力提示。'
    },
    inventory_balance: {
      title: '库存水位动态监测',
      hint: '后续图表将聚焦库存天数、周转率和渠道折扣，判断当前是补库、平衡还是去库阶段。'
    },
    logistics_delay: {
      title: '物流延误风险扫描',
      hint: '后续预测将放大运输时效、港口拥堵和运价变量，识别潜在到厂延迟和交付风险。'
    }
  },

  cycle: {
    supply_demand: {
      title: '供需匹配周期判断',
      hint: '后续周期分析将把供需关系作为主线，比较终端需求、排产计划、库存水位和供应商产能响应。'
    },
    inventory_cycle: {
      title: '补库/去库周期定位',
      hint: '后续周期分解将优先判断当前库存处于主动补库、被动累库还是去库调整阶段。'
    },
    production_rhythm: {
      title: '排产节律识别',
      hint: '后续分析会结合月度产能、车型切换和节假日因素，识别排产波峰波谷。'
    },
    material_price_cycle: {
      title: '成本周期窗口判断',
      hint: '后续图表会突出锂、镍、钢、铝等材料价格周期，为采购锁价和备货节奏提供参考。'
    }
  },

  turning: {
    shortage_turning: {
      title: '断供风险拐点预警',
      hint: '后续拐点曲线会提高对交期拉长、报价跳升和库存下降组合信号的敏感度。'
    },
    cost_rebound: {
      title: '成本反弹触发监测',
      hint: '后续分析会突出材料和运价的快速反弹信号，评估对BOM成本和整车毛利的冲击。'
    },
    inventory_overhang: {
      title: '库存积压拐点识别',
      hint: '后续模型会重点标注库存天数、折扣率和动销速度恶化的临界点。'
    },
    supplier_break: {
      title: '供应商断点风险评估',
      hint: '后续分析会围绕供应商集中度、交付稳定性、质量事件和财务压力输出风险节点。'
    }
  }
}

export default {
  name: 'CombinedPrediction',
  components: { TrendPrediction, CyclePrediction, TurningPointPrediction },

  data() {
    return {
      activeKey: 'trend',
      govCollapsed: false,
      selectedMandates: {
        trend: 'component_pressure',
        cycle: 'supply_demand',
        turning: 'shortage_turning'
      },
      enabledDomainsMap: {
        trend: ['chip_supply', 'battery_material', 'vehicle_inventory', 'logistics_delivery'],
        cycle: ['terminal_demand', 'channel_inventory', 'production_plan', 'supplier_capacity'],
        turning: ['supplier_health', 'shortage_signal', 'cost_signal', 'inventory_alert']
      }
    }
  },

  computed: {
    currentGovConfig() {
      return GOVERNANCE_CONFIG[this.activeKey] || GOVERNANCE_CONFIG.trend
    },
    activeTabLabel() {
      return { trend: '趋势预测', cycle: '周期分析', turning: '拐点识别' }[this.activeKey] || ''
    },
    selectedMandateLabel() {
      const m = this.selectedMandates[this.activeKey]
      const opt = this.currentGovConfig.mandateOptions.find(o => o.value === m)
      return opt ? opt.label : '—'
    },
    activeDomainCount() {
      return (this.enabledDomainsMap[this.activeKey] || []).length
    },
    avgDomainQuality() {
      const enabled = this.enabledDomainsMap[this.activeKey] || []
      const domains = this.currentGovConfig.dataDomains.filter(d => enabled.includes(d.id))
      if (!domains.length) return 0
      return Math.round(domains.reduce((s, d) => s + d.quality, 0) / domains.length)
    },
    analysisContext() {
      const mandateValue = this.selectedMandates[this.activeKey]
      const activeDomains = this.currentGovConfig.dataDomains.filter(d => (this.enabledDomainsMap[this.activeKey] || []).includes(d.id))
      const mandate = this.currentGovConfig.mandateOptions.find(o => o.value === mandateValue) || this.currentGovConfig.mandateOptions[0]
      const outputMeta = OUTPUT_HINT_MAP[this.activeKey]?.[mandateValue] || {
        title: '统一供应链研判输出',
        hint: '后续分析内容将基于当前供应链问题设定重新生成。'
      }

      return {
        tabKey: this.activeKey,
        tabLabel: this.activeTabLabel,
        mandate: {
          value: mandate?.value || '',
          label: mandate?.label || '—',
          desc: mandate?.desc || ''
        },
        activeDomains,
        activeDomainIds: activeDomains.map(d => d.id),
        avgQuality: this.avgDomainQuality,
        domainSummary: activeDomains.map(d => d.label).join('、'),
        timeRange: this.currentGovConfig.timeRange,
        assumptions: [...this.currentGovConfig.assumptions],
        outputTitle: outputMeta.title,
        outputHint: outputMeta.hint
      }
    },
    govStatusClass() {
      const q = this.avgDomainQuality
      if (q >= 75) return 'status-good'
      if (q >= 55) return 'status-warn'
      return 'status-poor'
    }
  },

  watch: {
    '$route.fullPath': {
      immediate: true,
      handler() {
        this.syncActiveFromRoute()
      }
    }
  },

  methods: {
    syncActiveFromRoute() {
      const view = this.$route?.query?.view
      if (view === 'trend' || view === 'cycle' || view === 'turning') {
        this.activeKey = view
        return
      }

      const path = this.$route?.path || ''
      if (path.endsWith('/trend')) this.activeKey = 'trend'
      else if (path.endsWith('/cycle')) this.activeKey = 'cycle'
      else if (path.endsWith('/turning-point')) this.activeKey = 'turning'
      else if (path.endsWith('/supply-chain')) this.activeKey = 'trend'
    },
    onTabSwitch(tabKey) {
      this.activeKey = tabKey

      const currentPath = this.$route?.path || '/home/supplyChain/prediction/supply-chain'
      this.$router.replace({
        path: currentPath,
        query: {
          ...(this.$route?.query || {}),
          view: tabKey
        }
      })
    },
    isDomainEnabled(domainId) {
      return (this.enabledDomainsMap[this.activeKey] || []).includes(domainId)
    },
    toggleDomain(domainId) {
      const list = this.enabledDomainsMap[this.activeKey] || []
      const idx = list.indexOf(domainId)

      if (idx >= 0) {
        if (list.length > 1) list.splice(idx, 1)
      } else {
        list.push(domainId)
      }
    },
    qualityColor(q) {
      if (q >= 80) return '#22c55e'
      if (q >= 65) return '#f59e0b'
      return '#ef4444'
    }
  }
}
</script>

<style scoped>
.combined-prediction {
  padding: 10px 10px 4px;
}

/* ── 供应链问题设定面板 ──────────────────────────────────────── */
.gov-panel {
  margin: 0 12px 12px;
  border: 1px solid #c7d7f4;
  border-left: 3px solid #2f6fed;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%);
  overflow: hidden;
  transition: border-color 0.2s;
}
.gov-panel.gov-collapsed {
  border-left-color: #94b4e8;
}

.gov-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  gap: 12px;
}
.gov-header:hover { background: rgba(47, 111, 237, 0.04); }

.gov-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.gov-status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse-dot 2s infinite;
}
.gov-status-dot.status-good { background: #22c55e; }
.gov-status-dot.status-warn { background: #f59e0b; }
.gov-status-dot.status-poor { background: #ef4444; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.gov-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a6e;
  letter-spacing: 0.01em;
}
.gov-phase-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.gov-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  justify-content: flex-end;
}
.gov-mandate-chip {
  font-size: 12px;
  font-weight: 600;
  color: #2f6fed;
  background: #dbeafe;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.gov-domain-summary {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}
.gov-chevron {
  color: #6b7280;
  flex-shrink: 0;
  transition: transform 0.25s ease;
}
.gov-chevron.rotated { transform: rotate(180deg); }

.gov-slide-enter-active,
.gov-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  max-height: 600px;
  overflow: hidden;
}
.gov-slide-enter-from,
.gov-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.gov-body {
  padding: 0 16px 16px;
  border-top: 1px solid #dbeafe;
}
.gov-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 0.9fr;
  gap: 16px;
  padding-top: 14px;
}

.gov-col-header {
  font-size: 11px;
  font-weight: 700;
  color: #4b5b7c;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #dbeafe;
}

.mandate-list { display: flex; flex-direction: column; gap: 8px; }
.mandate-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.mandate-item:hover { background: #f0f6ff; }
.mandate-item.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.mandate-radio {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid #94a3b8;
  flex-shrink: 0;
  margin-top: 2px;
  transition: border-color 0.15s;
}
.mandate-radio.active {
  border-color: #2f6fed;
  background: radial-gradient(circle, #2f6fed 40%, transparent 40%);
}
.mandate-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e3a6e;
  line-height: 1.3;
}
.mandate-desc {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
  line-height: 1.5;
}

.domain-list { display: flex; flex-direction: column; gap: 7px; }
.domain-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5edf8;
  background: #fff;
  cursor: pointer;
  transition: opacity 0.2s, border-color 0.15s;
}
.domain-row:hover { border-color: #93c5fd; }
.domain-row.domain-off { opacity: 0.42; }
.domain-check {
  width: 16px; height: 16px;
  border-radius: 4px;
  border: 1.5px solid #94a3b8;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.domain-check.active {
  background: #2f6fed;
  border-color: #2f6fed;
}
.domain-info { flex: 1; min-width: 0; }
.domain-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e3a6e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.domain-coverage {
  font-size: 10.5px;
  color: #9ca3af;
  margin-top: 1px;
}
.domain-q-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.domain-q-bar {
  width: 52px; height: 5px;
  background: #e5e7eb;
  border-radius: 99px;
  overflow: hidden;
}
.domain-q-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.3s;
}
.domain-q-val {
  font-size: 11px;
  font-weight: 700;
  min-width: 30px;
  text-align: right;
}

.assume-list { display: flex; flex-direction: column; gap: 7px; }
.assume-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 11.5px;
  line-height: 1.5;
}
.assume-index {
  flex-shrink: 0;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #2f6fed;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin-top: 1px;
}
.assume-text { color: #374151; }
.gov-time-range {
  margin-top: 12px;
  padding: 7px 10px;
  background: #f0f6ff;
  border-radius: 8px;
  border: 1px solid #dbeafe;
}
.gov-time-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 3px;
}
.gov-time-val {
  font-size: 11.5px;
  color: #1e3a6e;
  font-weight: 600;
}

@media (max-width: 900px) {
  .gov-grid { grid-template-columns: 1fr; }
}

/* ── /供应链问题设定面板 ──────────────────────────────────────── */

.switch-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid #e6ebf5;
  border-radius: 12px;
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8ff 100%);
  margin-bottom: 12px;
  margin-left: 12px;
  margin-right: 12px;
}

.switch-title-wrap { min-width: 0; }
.switch-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2a44;
  line-height: 1.1;
}
.switch-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.switch-group :deep(.el-radio-button__inner) {
  border-radius: 999px;
  border: 1px solid #d8e0ef;
  margin-left: 6px;
  min-width: 90px;
  text-align: center;
  box-shadow: none;
}
.switch-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
  margin-left: 0;
}
.switch-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #2f6fed;
  border-color: #2f6fed;
}

.problem-brief-shell {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 12px;
  margin: 0 12px 12px;
}

.problem-brief-card {
  padding: 14px 16px;
  border: 1px solid #e6ebf5;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.problem-brief-card.primary {
  background: linear-gradient(180deg, #fbfdff 0%, #f2f7ff 100%);
  border-color: #d8e4fb;
}

.problem-brief-label {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.problem-brief-title {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2a44;
  line-height: 1.35;
}

.problem-brief-text {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}

.pane-container { padding: 0; }

@media (max-width: 980px) {
  .problem-brief-shell {
    grid-template-columns: 1fr;
  }
  .switch-shell {
    flex-direction: column;
    align-items: stretch;
  }
  .switch-group {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .switch-group :deep(.el-radio-button) { width: 100%; }
  .switch-group :deep(.el-radio-button__inner) { margin-left: 0; width: 100%; }
}
</style>
