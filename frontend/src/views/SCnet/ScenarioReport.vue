<template>
  <div ref="dashboardWrapperRef" class="dashboard-wrapper">
    <button class="back-to-setup-btn" @click="$emit('back')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span>返回场景设定</span>
    </button>

    <div class="chat-summary-bar">
      <div class="chat-summary-inner">
        <span class="chat-q-label">📌 分析场景：</span>
        <span class="chat-q-text">{{ getScenarioSummary() }}</span>
      </div>

      <div class="inline-chat-input">
        <input
          v-model="feedbackInput"
          class="inline-input"
          placeholder="继续追问或补充条件..."
          @keyup.enter="submitFeedback"
          :disabled="isProcessing"
        />

        <button
          class="inline-send-btn"
          @click="submitFeedback"
          :disabled="isProcessing || !feedbackInput.trim()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="aiReply" class="ai-reply-bar">
      <span class="ai-avatar">🤖</span>
      <div class="ai-reply-text">{{ aiReply }}</div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-title">💰 营业收入 (2025)</div>
        <div class="kpi-value">¥{{ formatFixed(getLatestValue(revenue), 2) }}亿</div>
        <div class="kpi-sub">2006年：¥{{ formatFixed(revenue[0], 2) }}亿</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">📉 营业成本 (2025)</div>
        <div class="kpi-value">¥{{ formatFixed(getLatestValue(cost), 2) }}亿</div>
        <div class="kpi-sub">2025年毛利率：{{ formatFixed(getLatestValue(grossMargin), 2) }}%</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">🏦 总资产 (2025)</div>
        <div class="kpi-value">¥{{ formatFixed(getLatestValue(totalAssets), 2) }}亿</div>
        <div class="kpi-sub">2006年：¥{{ formatFixed(totalAssets[0], 2) }}亿</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">📦 存货 (2025)</div>
        <div class="kpi-value">¥{{ formatFixed(getLatestValue(inventory), 2) }}亿</div>
        <div class="kpi-sub">存货周转率：{{ formatFixed(getLatestValue(inventoryTurnover), 2) }}次</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">🔬 研发费用 (2025)</div>
        <div class="kpi-value">¥{{ formatFixed(getLatestValue(rdExpense), 2) }}亿</div>
        <div class="kpi-sub">2006年：¥{{ formatFixed(rdExpense[0], 2) }}亿</div>
      </div>
    </div>

    <div class="chart-card full-width">
      <div class="chart-header">
        <h3>📊 营业收入 vs 营业成本 (2006-2025)</h3>
        <div class="legend-tag">
          <span class="legend-item">
            <span class="color-dot" style="background:#5470c6;"></span>
            营业收入
          </span>
          <span class="legend-item">
            <span class="color-dot" style="background:#fac858;"></span>
            营业成本
          </span>
        </div>
      </div>
      <div ref="revenueCostChartRef" class="chart-container"></div>
    </div>

    <div class="chart-row">
      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>🔬 研发费用增长趋势</h3>
        </div>
        <div ref="rdChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>📢 销售费用 vs 管理费用</h3>
        </div>
        <div ref="salesMgmtChartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>🏛️ 总资产 & 存货规模</h3>
        </div>
        <div ref="assetsInventoryChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>🥧 2025年费用结构占比</h3>
        </div>
        <div ref="expensePieChartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>📈 毛利率趋势</h3>
        </div>
        <div ref="grossMarginChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card half-width">
        <div class="chart-header">
          <h3>🔄 存货周转率趋势</h3>
        </div>
        <div ref="inventoryTurnoverChartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="milestone-section">
      <div class="section-title">
        <span>📌 图中的拐点年份与关键事件</span>
        <span class="badge info-badge">仅保留明显拐点</span>
      </div>

      <div class="milestone-grid">
        <div class="milestone-card" v-for="item in turningPointEvents" :key="item.year">
          <div class="milestone-year">{{ item.year }}</div>
          <div class="milestone-title">{{ item.title }}</div>
          <div class="milestone-desc">{{ item.event }}</div>

          <div class="milestone-metrics">
            <span class="metric-chip">营收：{{ item.revenue }}亿</span>
            <span class="metric-chip">总资产：{{ item.assets }}亿</span>
            <span class="metric-chip">研发：{{ item.rd }}亿</span>
            <span class="metric-chip">毛利率：{{ item.grossMargin }}%</span>
          </div>

          <div class="milestone-impact">
            <strong>图表对应：</strong>{{ item.impact }}
          </div>
        </div>
      </div>
    </div>

    <div class="risk-section">
      <div class="section-title">
        <span>⚠️ 供应链关键节点公开信息提示</span>
        <span class="badge warn-badge">非财报披露口径</span>
      </div>

      <table class="risk-table">
        <thead>
          <tr>
            <th>城市/节点</th>
            <th>产品类型</th>
            <th>主要相关企业</th>
            <th>依赖度</th>
            <th>风险权重</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in highRiskSuppliers" :key="item.city">
            <td><strong>{{ item.city }}</strong></td>
            <td>{{ item.product }}</td>
            <td>{{ item.enterprise }}</td>
            <td><span class="badge">{{ item.depend }}</span></td>
            <td>{{ item.risk }}</td>
          </tr>
        </tbody>
      </table>

      <div class="prejudge-text">
        <strong>📋 综合结论 · 财务与供应链联动分析</strong><br />
        根据你提供的数据，比亚迪营业收入从2006年的129.39亿元增长至2025年的8,039.65亿元；
        总资产从2006年的163.87亿元增长至2025年的8,837.30亿元；
        研发费用从2006年的1.74亿元增长至2025年的634.00亿元。
        可视化中最明显的拐点集中在2020、2022、2023和2025年前后，分别对应技术突破、业务结构切换、规模化爆发和外部供应链压力情景。
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'ScenarioReport',

  props: {
    scenarioData: {
      type: Object,
      required: true
    },
    selectedPhase: {
      type: String,
      default: 'pre'
    }
  },

  emits: ['back'],

  data() {
    return {
      isProcessing: false,
      feedbackInput: '',
      aiReply: '',
      renderTimer: null,
      resizeObserver: null,
      chartInstances: {},

      years: [
        '2006', '2007', '2008', '2009', '2010',
        '2011', '2012', '2013', '2014', '2015',
        '2016', '2017', '2018', '2019', '2020',
        '2021', '2022', '2023', '2024', '2025'
      ],

      revenue: [
        129.39, 212.11, 267.88, 394.69, 466.85,
        463.12, 443.81, 497.68, 553.66, 776.12,
        1002.08, 1026.51, 1217.91, 1217.78, 1534.69,
        2113.00, 4240.61, 6023.15, 7771.02, 8039.65
      ],

      cost: [
        102.01, 169.64, 215.69, 309.05, 384.21,
        394.45, 392.55, 432.52, 477.43, 657.53,
        811.89, 847.16, 1037.24, 1037.02, 1262.26,
        1876.67, 3518.16, 4903.99, 6260.47, 6613.05
      ],

      salesExpense: [
        4.80, 6.48, 9.35, 14.90, 21.76,
        18.00, 15.12, 20.12, 22.29, 28.68,
        41.96, 49.25, 47.29, 43.46, 50.56,
        60.82, 150.61, 153.71, 168.92, 261.85
      ],

      mgmtExpense: [
        8.50, 16.57, 14.84, 15.08, 19.18,
        21.26, 20.55, 20.74, 26.01, 34.29,
        36.90, 30.48, 38.26, 42.32, 43.96,
        57.42, 100.07, 134.62, 142.26, 142.26
      ],

      rdExpense: [
        1.74, 6.95, 11.63, 12.83, 14.03,
        13.74, 11.50, 12.79, 18.65, 19.98,
        31.72, 37.39, 49.89, 56.29, 74.65,
        79.91, 186.54, 395.75, 542.00, 634.00
      ],

      financeExpense: [
        2.47, 3.88, 4.92, 2.55, 2.81,
        7.42, 8.62, 10.17, 13.97, 15.17,
        18.00, 23.43, 34.81, 34.87, 31.24,
        19.08, 16.18, 5.30, 11.27, 11.27
      ],

      totalAssets: [
        163.87, 292.88, 328.91, 407.36, 538.75,
        668.81, 700.08, 780.15, 940.09, 1154.86,
        1450.71, 1780.99, 1945.71, 1956.42, 2010.17,
        2957.80, 4938.61, 6795.48, 7833.56, 8837.30
      ],

      inventory: [
        31.57, 45.49, 69.16, 44.08, 65.38,
        65.96, 73.45, 82.21, 99.78, 157.51,
        173.78, 198.73, 263.30, 255.72, 313.96,
        433.55, 791.07, 1216.32, 1326.78, 1326.78
      ],

      highRiskSuppliers: [
        {
          city: '上海市',
          product: '车规级芯片/ECU',
          enterprise: '地平线/比亚迪半导体等公开报道相关企业',
          depend: '公开未披露',
          risk: '公开未披露'
        },
        {
          city: '新竹',
          product: '晶圆代工/车规芯片',
          enterprise: '台积电/联电等行业代表企业',
          depend: '公开未披露',
          risk: '公开未披露'
        },
        {
          city: '槟城',
          product: '封装测试/半导体制造配套',
          enterprise: '英特尔/ASE等行业代表企业',
          depend: '公开未披露',
          risk: '公开未披露'
        },
        {
          city: '斯图加特',
          product: 'ECU/传感器/汽车电子',
          enterprise: '博世等行业代表企业',
          depend: '公开未披露',
          risk: '公开未披露'
        }
      ]
    }
  },

  computed: {
    grossMargin() {
      return this.years.map((_, i) => {
        if (!this.revenue[i] || !this.cost[i]) return null
        return Number((((this.revenue[i] - this.cost[i]) / this.revenue[i]) * 100).toFixed(2))
      })
    },

    inventoryTurnover() {
      return this.years.map((_, i) => {
        if (!this.inventory[i] || !this.cost[i]) return null
        return Number((this.cost[i] / this.inventory[i]).toFixed(2))
      })
    },

    turningPointEvents() {
      const makeItem = (year, title, event, impact) => {
        const idx = this.years.indexOf(year)

        return {
          year,
          title,
          event,
          impact,
          revenue: this.formatFixed(this.revenue[idx], 2),
          assets: this.formatFixed(this.totalAssets[idx], 2),
          rd: this.formatFixed(this.rdExpense[idx], 2),
          grossMargin: this.formatFixed(this.grossMargin[idx], 2)
        }
      }

      return [
        makeItem(
          '2020',
          '技术拐点：刀片电池发布',
          '比亚迪发布刀片电池，强化电池安全性与技术辨识度，为后续车型放量提供技术支撑。',
          '2020年后营收、研发费用、总资产开始进入更明显的上行通道。'
        ),
        makeItem(
          '2022',
          '业务结构拐点：全面聚焦新能源',
          '比亚迪停止生产纯燃油汽车，业务重心全面转向纯电动和插电式混合动力汽车。',
          '营收从2021年的2113.00亿元跃升至4240.61亿元，研发费用也升至186.54亿元，是图中最明显的一次跃升。'
        ),
        makeItem(
          '2023',
          '规模拐点：销量突破300万辆',
          '比亚迪全年销量突破300万辆，新能源车规模优势进一步放大，并带动全球化布局加速。',
          '营收突破6000亿元，总资产接近6800亿元，研发费用接近400亿元，体现规模化扩张。'
        ),
        makeItem(
          '2025',
          '外部压力拐点：关税与供应链重构情景',
          '结合你提供的中美关税、贸易波动、海运与供应链重构材料，2025年可作为外部压力情景观察点。',
          '图中销售费用明显上升，同时营收增速趋缓，适合解释为全球化拓展、合规、渠道与供应链调整成本上升。'
        )
      ]
    }
  },

  mounted() {
    this.aiReply = `已完成对"${this.getScenarioSummary()}"场景的分析。以下为比亚迪2006-2025财务数据可视化报告。`
    this.scheduleRenderCharts()
    window.addEventListener('resize', this.handleResize)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)

    if (this.renderTimer) {
      clearTimeout(this.renderTimer)
      this.renderTimer = null
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    Object.values(this.chartInstances).forEach(chart => {
      if (chart) {
        chart.dispose()
      }
    })

    this.chartInstances = {}
  },

  methods: {
    getScenarioSummary() {
      const companyMap = {
        byd: '比亚迪',
        geely: '吉利',
        saic: '上汽'
      }

      const company = companyMap[this.scenarioData.targetCompany] || '比亚迪'
      const bg = this.scenarioData.historicalBackground || ''

      return `${company} · ${bg.substring(0, 40)}...`
    },

    formatFixed(val, digits = 2) {
      if (val === null || val === undefined || Number.isNaN(Number(val))) {
        return '--'
      }

      return Number(val).toFixed(digits)
    },

    getLatestValue(arr) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const v = arr[i]

        if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
          return v
        }
      }

      return null
    },

    submitFeedback() {
      if (!this.feedbackInput.trim() || this.isProcessing) {
        return
      }

      const q = this.feedbackInput.trim()
      this.feedbackInput = ''
      this.isProcessing = true

      setTimeout(() => {
        this.isProcessing = false
        this.aiReply = `针对"${q}"：根据当前表格数据，2025年比亚迪营业收入为8,039.65亿元，营业成本为6,613.05亿元，研发费用为634.00亿元，总资产为8,837.30亿元，存货为1,326.78亿元。`
      }, 800)
    },

    scheduleRenderCharts() {
      if (this.renderTimer) {
        clearTimeout(this.renderTimer)
      }

      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.renderTimer = setTimeout(() => {
            this.renderAllCharts()
            this.bindResizeObserver()

            setTimeout(() => {
              this.handleResize()
            }, 300)
          }, 200)
        })
      })
    },

    renderAllCharts() {
      const chartMethods = [
        this.renderRevenueCostChart,
        this.renderRdChart,
        this.renderSalesMgmtChart,
        this.renderAssetsInventoryChart,
        this.renderExpensePieChart,
        this.renderGrossMarginChart,
        this.renderInventoryTurnoverChart
      ]

      chartMethods.forEach(fn => {
        try {
          fn.call(this)
        } catch (error) {
          console.error('图表渲染失败：', error)
        }
      })
    },

    bindResizeObserver() {
      if (typeof ResizeObserver === 'undefined') {
        return
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize()
      })

      const targets = [
        this.$refs.dashboardWrapperRef,
        this.$refs.revenueCostChartRef,
        this.$refs.rdChartRef,
        this.$refs.salesMgmtChartRef,
        this.$refs.assetsInventoryChartRef,
        this.$refs.expensePieChartRef,
        this.$refs.grossMarginChartRef,
        this.$refs.inventoryTurnoverChartRef
      ]

      targets.forEach(el => {
        if (el) {
          this.resizeObserver.observe(el)
        }
      })
    },

    ensureChartDom(refName, callback, retryCount = 0) {
      const dom = this.$refs[refName]

      if (!dom) {
        return
      }

      const width = dom.clientWidth
      const height = dom.clientHeight

      if ((width === 0 || height === 0) && retryCount < 12) {
        setTimeout(() => {
          this.ensureChartDom(refName, callback, retryCount + 1)
        }, 120)

        return
      }

      callback(dom)
    },

    initChart(key, dom) {
      if (this.chartInstances[key]) {
        this.chartInstances[key].dispose()
      }

      this.chartInstances[key] = echarts.init(dom)

      return this.chartInstances[key]
    },

    numberTooltip(unit = '亿元') {
      return {
        trigger: 'axis',
        formatter: params => {
          return params.map(item => {
            const value = item.value === null || item.value === undefined ? '--' : item.value
            return `${item.marker}${item.seriesName}：${value}${unit}`
          }).join('<br/>')
        }
      }
    },

    renderRevenueCostChart() {
      this.ensureChartDom('revenueCostChartRef', dom => {
        const chart = this.initChart('revenueCost', dom)

        chart.setOption({
          tooltip: this.numberTooltip('亿元'),
          legend: {
            data: ['营业收入', '营业成本'],
            left: 'left',
            top: 0
          },
          grid: {
            left: '8%',
            right: '6%',
            top: '14%',
            bottom: '16%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            name: '金额(亿元)',
            nameLocation: 'middle',
            nameGap: 50
          },
          series: [
            {
              name: '营业收入',
              type: 'bar',
              data: this.revenue,
              itemStyle: {
                color: '#5470c6',
                borderRadius: [4, 4, 0, 0]
              },
              barWidth: '34%'
            },
            {
              name: '营业成本',
              type: 'bar',
              data: this.cost,
              itemStyle: {
                color: '#fac858',
                borderRadius: [4, 4, 0, 0]
              },
              barWidth: '34%'
            }
          ]
        }, true)
      })
    },

    renderRdChart() {
      this.ensureChartDom('rdChartRef', dom => {
        const chart = this.initChart('rd', dom)

        chart.setOption({
          tooltip: this.numberTooltip('亿元'),
          grid: {
            left: '10%',
            right: '8%',
            top: '12%',
            bottom: '14%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            name: '研发费用(亿元)'
          },
          series: [
            {
              name: '研发费用',
              type: 'line',
              data: this.rdExpense,
              smooth: true,
              lineStyle: {
                width: 3,
                color: '#ee6666'
              },
              areaStyle: {
                opacity: 0.18
              },
              itemStyle: {
                color: '#ee6666'
              },
              symbol: 'circle',
              symbolSize: 7
            }
          ]
        }, true)
      })
    },

    renderSalesMgmtChart() {
      this.ensureChartDom('salesMgmtChartRef', dom => {
        const chart = this.initChart('salesMgmt', dom)

        chart.setOption({
          tooltip: this.numberTooltip('亿元'),
          legend: {
            data: ['销售费用', '管理费用'],
            left: 'left',
            top: 0
          },
          grid: {
            left: '10%',
            right: '8%',
            top: '15%',
            bottom: '14%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            name: '费用(亿元)'
          },
          series: [
            {
              name: '销售费用',
              type: 'line',
              data: this.salesExpense,
              lineStyle: {
                color: '#3ba272',
                width: 2.5
              },
              itemStyle: {
                color: '#3ba272'
              },
              smooth: true,
              symbolSize: 6
            },
            {
              name: '管理费用',
              type: 'line',
              data: this.mgmtExpense,
              lineStyle: {
                color: '#73c0de',
                width: 2.5
              },
              itemStyle: {
                color: '#73c0de'
              },
              smooth: true,
              symbolSize: 6
            }
          ]
        }, true)
      })
    },

    renderAssetsInventoryChart() {
      this.ensureChartDom('assetsInventoryChartRef', dom => {
        const chart = this.initChart('assetsInventory', dom)

        chart.setOption({
          tooltip: this.numberTooltip('亿元'),
          legend: {
            data: ['总资产', '存货'],
            left: 'left',
            top: 0
          },
          grid: {
            left: '10%',
            right: '10%',
            top: '15%',
            bottom: '14%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: [
            {
              type: 'value',
              name: '总资产(亿元)'
            },
            {
              type: 'value',
              name: '存货(亿元)'
            }
          ],
          series: [
            {
              name: '总资产',
              type: 'bar',
              data: this.totalAssets,
              itemStyle: {
                color: '#9a60b4'
              },
              barWidth: '32%'
            },
            {
              name: '存货',
              type: 'line',
              data: this.inventory,
              yAxisIndex: 1,
              smooth: true,
              symbolSize: 6,
              lineStyle: {
                color: '#ea7ccc',
                width: 2.5
              },
              itemStyle: {
                color: '#ea7ccc'
              }
            }
          ]
        }, true)
      })
    },

    renderExpensePieChart() {
      this.ensureChartDom('expensePieChartRef', dom => {
        const chart = this.initChart('expensePie', dom)
        const idx2025 = this.years.length - 1

        const pieData = [
          {
            name: '研发费用',
            value: this.rdExpense[idx2025],
            itemStyle: { color: '#ee6666' }
          },
          {
            name: '销售费用',
            value: this.salesExpense[idx2025],
            itemStyle: { color: '#3ba272' }
          },
          {
            name: '管理费用',
            value: this.mgmtExpense[idx2025],
            itemStyle: { color: '#73c0de' }
          },
          {
            name: '财务费用',
            value: this.financeExpense[idx2025],
            itemStyle: { color: '#fac858' }
          }
        ].filter(item => {
          return item.value !== null && item.value !== undefined && !Number.isNaN(Number(item.value))
        })

        chart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}亿元 ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center'
          },
          series: [
            {
              name: '2025年费用结构',
              type: 'pie',
              radius: ['40%', '68%'],
              center: ['62%', '50%'],
              data: pieData,
              avoidLabelOverlap: true,
              label: {
                formatter: '{b}: {d}%'
              }
            }
          ]
        }, true)
      })
    },

    renderGrossMarginChart() {
      this.ensureChartDom('grossMarginChartRef', dom => {
        const chart = this.initChart('grossMargin', dom)

        chart.setOption({
          tooltip: this.numberTooltip('%'),
          grid: {
            left: '10%',
            right: '8%',
            top: '12%',
            bottom: '14%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            name: '毛利率(%)'
          },
          series: [
            {
              name: '毛利率',
              type: 'line',
              data: this.grossMargin,
              smooth: true,
              lineStyle: {
                width: 3,
                color: '#d32f2f'
              },
              itemStyle: {
                color: '#d32f2f'
              },
              areaStyle: {
                opacity: 0.1
              },
              symbol: 'circle',
              symbolSize: 7
            }
          ]
        }, true)
      })
    },

    renderInventoryTurnoverChart() {
      this.ensureChartDom('inventoryTurnoverChartRef', dom => {
        const chart = this.initChart('inventoryTurnover', dom)

        chart.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: params => {
              const item = params[0]
              const value = item.value === null || item.value === undefined ? '--' : item.value

              return `${item.axisValue}<br/>${item.marker}存货周转率：${value} 次`
            }
          },
          grid: {
            left: '10%',
            right: '8%',
            top: '12%',
            bottom: '14%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.years,
            axisLabel: {
              rotate: 45,
              fontSize: 10,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            name: '存货周转率(次)'
          },
          series: [
            {
              name: '存货周转率',
              type: 'bar',
              data: this.inventoryTurnover,
              itemStyle: {
                color: '#48b5d0',
                borderRadius: [6, 6, 0, 0]
              },
              barWidth: '45%'
            }
          ]
        }, true)
      })
    },

    handleResize() {
      Object.values(this.chartInstances).forEach(chart => {
        if (chart) {
          chart.resize()
        }
      })
    }
  }
}
</script>

<style scoped>
.dashboard-wrapper {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  background-color: #f5f7fa;
  position: relative;
  box-sizing: border-box;
}

.back-to-setup-btn {
  position: sticky;
  top: 0;
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
  color: #606266;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  width: fit-content;
  margin-bottom: 10px;
}

.back-to-setup-btn:hover {
  background: #f0f7ff;
  border-color: #409eff;
  color: #409eff;
}

.chat-summary-bar {
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 12px 18px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.chat-summary-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 260px;
}

.chat-q-label {
  font-size: 0.8rem;
  color: #1d4ed8;
  font-weight: 600;
}

.chat-q-text {
  font-size: 0.85rem;
  color: #1e3a8a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-chat-input {
  display: flex;
  gap: 8px;
}

.inline-input {
  padding: 6px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  width: 240px;
  outline: none;
  box-sizing: border-box;
}

.inline-input:focus {
  border-color: #2563eb;
}

.inline-send-btn {
  background: #2563eb;
  border: none;
  border-radius: 20px;
  width: 32px;
  height: 32px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inline-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-reply-bar {
  background: #f8fafc;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 14px;
  display: flex;
  gap: 10px;
}

.ai-avatar {
  flex-shrink: 0;
}

.ai-reply-text {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
}

.kpi-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: white;
  border-radius: 20px;
  padding: 16px 20px;
  flex: 1 1 180px;
  border: 1px solid #e9eef4;
  transition: all 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.kpi-title {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
}

.kpi-sub {
  font-size: 0.7rem;
  color: #94a3b8;
  padding-top: 6px;
  border-top: 1px solid #eef2f6;
}

.chart-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e9eef4;
  box-sizing: border-box;
}

.full-width {
  width: 100%;
}

.chart-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.half-width {
  flex: 1 1 calc(50% - 10px);
  min-width: 320px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.legend-tag {
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.chart-container {
  width: 100%;
  height: 340px;
  min-height: 340px;
  display: block;
}

.full-width .chart-container {
  height: 420px;
  min-height: 420px;
}

.milestone-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #e9eef4;
  margin-bottom: 20px;
}

.milestone-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.milestone-card {
  background: linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%);
  border: 1px solid #e5edf5;
  border-radius: 16px;
  padding: 14px;
  transition: all 0.2s ease;
  min-height: 250px;
}

.milestone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.milestone-year {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  margin-bottom: 10px;
}

.milestone-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.milestone-desc {
  font-size: 12px;
  color: #475569;
  line-height: 1.65;
  margin-bottom: 12px;
}

.milestone-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.metric-chip {
  font-size: 11px;
  color: #334155;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 3px 8px;
}

.milestone-impact {
  background: #f8fafc;
  border-left: 3px solid #60a5fa;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #475569;
  line-height: 1.65;
}

.risk-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #e9eef4;
  margin-top: 8px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.risk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.risk-table th,
.risk-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
}

.risk-table th {
  color: #475569;
  background: #f8fafc;
}

.badge {
  background: #fee2e2;
  color: #b91c1c;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
  white-space: nowrap;
}

.info-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.warn-badge {
  background: #fee2e2;
  color: #b91c1c;
}

.prejudge-text {
  background: #f8fafc;
  padding: 14px 18px;
  border-radius: 14px;
  margin-top: 16px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #334155;
}

@media (max-width: 1200px) {
  .milestone-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .dashboard-wrapper {
    padding: 12px;
  }

  .half-width {
    min-width: 100%;
  }

  .kpi-value {
    font-size: 1.4rem;
  }

  .inline-input {
    width: 160px;
  }

  .chat-summary-inner {
    min-width: 100%;
  }

  .milestone-grid {
    grid-template-columns: 1fr;
  }

  .risk-table {
    min-width: 700px;
  }

  .risk-section {
    overflow-x: auto;
  }
}
</style>
