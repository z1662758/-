<template>
  <div class="combined-prediction">

    <!-- ── 分析前置：问题设定配置 ─────────────────────────────── -->
    <div class="gov-panel" :class="{ 'gov-collapsed': govCollapsed }">
      <div class="gov-header" @click="govCollapsed = !govCollapsed">
        <div class="gov-header-left">
          <span class="gov-status-dot" :class="govStatusClass"></span>
          <span class="gov-title">分析前置 · 铀供应链问题设定</span>
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
        <div class="switch-title">铀供应链态势预测引擎</div>
        <div class="switch-subtitle">趋势、周期、拐点三模块统一视图 · 核燃料供应链全链条覆盖</div>
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
        value: 'uranium_price',
        label: '天然铀价格趋势预判',
        desc: '跟踪U3O8现货与长协价格、SWU分离功成本、转化服务费变化，判断核燃料成本对核电运营经济性的影响。'
      },
      {
        value: 'mining_supply',
        label: '铀矿供给压力评估',
        desc: '监测哈萨克斯坦、加拿大、纳米比亚、尼日尔、澳大利亚等主产区的产量、地缘风险和出口政策变化。'
      },
      {
        value: 'enrichment_capacity',
        label: '浓缩产能瓶颈监测',
        desc: '观察全球离心浓缩产能分布（俄罗斯占44%）、制裁影响及欧美浓缩产能扩张进度。'
      },
      {
        value: 'conversion_transport',
        label: '转化与运输链路趋势',
        desc: '监测UF6转化产能、黄饼运输通道安全、CASK容器可用性和国际核材料运输合规动态。'
      }
    ],
    dataDomains: [
      { id: 'u3o8_price', label: 'U3O8 现货/长协价格', quality: 88, coverage: '2023.01 – 2026.06 · 现货价/长协价/SWU成本' },
      { id: 'mine_output', label: '全球铀矿产量', quality: 85, coverage: '2023.01 – 2026.06 · 哈萨克斯坦/Cameco/Orano/其他' },
      { id: 'enrichment_swu', label: '浓缩产能与SWU', quality: 82, coverage: '2023.01 – 2026.06 · 离心机/扩散厂/产能利用率' },
      { id: 'conversion_uf6', label: '转化服务与运输', quality: 76, coverage: '2023.01 – 2026.06 · UF6/黄饼/运输通道' }
    ],
    assumptions: [
      '哈萨克斯坦维持全球最大铀矿供应国地位（约45%），但物流通道和地缘关系仍存在不确定性',
      '俄罗斯浓缩产能占全球约44%，制裁升级可能迫使欧美加速本土浓缩产能建设',
      '尼日尔政变后铀矿出口恢复进度缓慢，对欧洲核电燃料供应构成结构性风险'
    ],
    timeRange: '2023.01 – 2026.06（核燃料供应链运行基准）+ 未来12个月预测窗口'
  },

  cycle: {
    mandateOptions: [
      {
        value: 'supply_demand_cycle',
        label: '铀供需关系周期分析',
        desc: '综合全球核电装机容量、二次铀供应（尾料再浓缩/稀释HEU）、一次铀矿产量，判断供需平衡阶段。'
      },
      {
        value: 'inventory_cycle',
        label: '战略储备与库存周期识别',
        desc: '提取核电运营商燃料库存、中间商囤货行为和战略储备释放的周期性规律。'
      },
      {
        value: 'enrichment_cycle',
        label: '浓缩服务周期判断',
        desc: '分析SWU价格周期、富集产能投资回报周期和欠料/超料策略对核电运营成本的影响。'
      },
      {
        value: 'fuel_fabrication_cycle',
        label: '燃料组件制造节律分析',
        desc: '观察燃料棒/组件制造周期、换料大修计划和新型事故容错燃料(ATF)导入节奏。'
      }
    ],
    dataDomains: [
      { id: 'reactor_demand', label: '全球核电装机与需求', quality: 86, coverage: '2020.01 – 2026.06 · 在运/在建/规划机组' },
      { id: 'secondary_supply', label: '二次铀供应', quality: 80, coverage: '2020.01 – 2026.06 · HEU稀释/尾料再浓缩' },
      { id: 'fuel_inventory', label: '核燃料库存周期', quality: 78, coverage: '2023.01 – 2026.06 · 运营商库存/中间库存' },
      { id: 'fabrication_capacity', label: '燃料组件制造产能', quality: 75, coverage: '2023.01 – 2026.06 · 组件产能/换料周期' }
    ],
    assumptions: [
      '全球核电装机容量稳中有升，小型模块化反应堆(SMR)部署进度影响中长期铀需求曲线',
      '二次铀供应（俄HEU稀释协议到期后的替代来源）将在2028年前后出现明显缺口',
      '燃料组件制造产能集中度较高，少数供应商的产能波动可能影响多个核电运营商的换料计划'
    ],
    timeRange: '2020.01 – 2026.06（供需周期基准）+ 未来24个月预测窗口'
  },

  turning: {
    mandateOptions: [
      {
        value: 'supply_disruption',
        label: '供应中断拐点识别',
        desc: '识别铀矿停产、浓缩厂故障、运输通道封锁等从可控扰动转为实质性供应危机的信号组合。'
      },
      {
        value: 'price_spike',
        label: '价格暴涨拐点预警',
        desc: '捕捉U3O8现货价、SWU费用和转化服务费的快速攀升信号，评估对核电发电成本和电价的冲击。'
      },
      {
        value: 'geopolitical_break',
        label: '地缘断供拐点判断',
        desc: '判断制裁升级、出口管制、海运封锁等事件是否从单一国家影响扩散为全球核燃料供应链断裂风险。'
      },
      {
        value: 'enrichment_dependency',
        label: '浓缩依赖度断点风险评估',
        desc: '监测对俄浓缩服务的单一依赖、欧美浓缩替代产能投运延迟和SWU价格溢价风险。'
      }
    ],
    dataDomains: [
      { id: 'mine_health', label: '主产铀矿运行健康度', quality: 84, coverage: '2024.01 – 2026.06 · 产量/停产/地缘/ISL酸耗' },
      { id: 'enrichment_signal', label: '浓缩产能预警信号', quality: 83, coverage: '2024.01 – 2026.06 · SWU价格/产能利用率/交货期' },
      { id: 'transport_signal', label: '运输安全信号', quality: 79, coverage: '2024.01 – 2026.06 · 航运/铁路/CASK/过境许可' },
      { id: 'sanction_signal', label: '制裁与政策信号', quality: 81, coverage: '2024.01 – 2026.06 · 俄罗斯/尼日尔/哈萨克斯坦' }
    ],
    assumptions: [
      '俄罗斯浓缩产能短期内不会完全退出市场，但出口限制和制裁升级可能导致SWU价格大幅波动',
      '尼日尔政变后铀矿出口恢复的不确定性是欧洲核电燃料安全的重要变量',
      '若U3O8价格连续突破$80-100/lb并叠加浓缩产能短缺，可能触发核电运营商恐慌性囤货'
    ],
    timeRange: '2024.01 – 2026.06（高频信号采集）+ 未来6个月拐点窗口'
  }
}

const OUTPUT_HINT_MAP = {
  trend: {
    uranium_price: {
      title: '铀价走势前置预警',
      hint: '后续趋势曲线将重点展示U3O8现货/长协价差、SWU成本和转化服务费变化，判断核电燃料成本压力。'
    },
    mining_supply: {
      title: '铀矿供给压力研判',
      hint: '后续分析会强化主产区产量、地缘风险和出口政策变量，输出供给缺口和替代来源提示。'
    },
    enrichment_capacity: {
      title: '浓缩产能瓶颈监测',
      hint: '后续图表将聚焦全球离心浓缩产能分布、SWU价格趋势和制裁影响评估。'
    },
    conversion_transport: {
      title: '转化与运输链路扫描',
      hint: '后续预测将放大UF6转化产能、运输通道安全性和CASK容器可用性变量。'
    }
  },

  cycle: {
    supply_demand_cycle: {
      title: '铀供需匹配周期判断',
      hint: '后续周期分析将把一次铀矿产量、二次铀供应和核电需求作为主线，判断供需平衡阶段。'
    },
    inventory_cycle: {
      title: '库存与战略储备周期定位',
      hint: '后续周期分解将优先判断当前核燃料库存处于主动补库、被动去库还是战略释放阶段。'
    },
    enrichment_cycle: {
      title: '浓缩服务周期识别',
      hint: '后续分析会结合SWU价格、产能投资周期和欠料/超料策略，识别浓缩服务周期的波峰波谷。'
    },
    fuel_fabrication_cycle: {
      title: '燃料组件制造节律判断',
      hint: '后续图表会突出燃料组件制造周期、换料大修计划和新型ATF燃料导入节奏。'
    }
  },

  turning: {
    supply_disruption: {
      title: '供应中断拐点预警',
      hint: '后续拐点曲线会提高对铀矿停产、浓缩厂故障和运输通道封锁组合信号的敏感度。'
    },
    price_spike: {
      title: '价格暴涨触发监测',
      hint: '后续分析会突出U3O8、SWU和转化服务费的快速攀升信号，评估对核电发电成本的冲击。'
    },
    geopolitical_break: {
      title: '地缘断供拐点识别',
      hint: '后续模型会重点标注制裁升级、出口管制和海运封锁从局部扩散为全局断链的临界点。'
    },
    enrichment_dependency: {
      title: '浓缩依赖断点评估',
      hint: '后续分析会围绕对俄浓缩依赖度、欧美替代产能投运延迟和SWU溢价风险输出风险节点。'
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
        trend: 'uranium_price',
        cycle: 'supply_demand_cycle',
        turning: 'supply_disruption'
      },
      enabledDomainsMap: {
        trend: ['u3o8_price', 'mine_output', 'enrichment_swu', 'conversion_uf6'],
        cycle: ['reactor_demand', 'secondary_supply', 'fuel_inventory', 'fabrication_capacity'],
        turning: ['mine_health', 'enrichment_signal', 'transport_signal', 'sanction_signal']
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
