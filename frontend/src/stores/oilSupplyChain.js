/**
 * Oil Supply Chain Store
 * 石油供应链全局状态管理
 *
 * @author SGM-MSE Team
 * @date 2026-06-02
 */

import { defineStore } from 'pinia'
import {
  getOilEvents,
  getOilStatistics,
  getOilInfrastructure,
  getOilMapFeatures,
  getOilPrices,
  getOilMarketOverview,
  getOilNews,
  getOilOpecProduction,
  getOilSprData,
  analyzeOilReport,
  getOilReportKnowledge
} from '@/api/oilSupplyChain'

export const useOilSupplyChainStore = defineStore('oilSupplyChain', {
  state: () => ({
    // 风险事件
    events: [],
    eventsLoading: false,
    eventFilter: {
      region: null,
      type: null,
      level: null
    },
    statistics: null,

    // 基础设施
    infrastructure: null,
    infrastructureLoading: false,

    // 地图
    mapFeatures: null,
    mapFeaturesLoading: false,

    // 价格
    priceData: null,
    priceLoading: false,

    // 市场概览
    marketOverview: null,
    marketOverviewLoading: false,

    // 新闻
    newsList: [],
    newsLoading: false,

    // OPEC
    opecData: null,

    // SPR
    sprData: null,

    // 报告
    reportResult: null,
    reportLoading: false,
    reportKnowledge: null,

    // 缓存
    lastFetchTime: null
  }),

  getters: {
    filteredEvents(state) {
      let result = state.events
      if (state.eventFilter.region) {
        result = result.filter(e => e.region === state.eventFilter.region)
      }
      if (state.eventFilter.type) {
        result = result.filter(e => e.type === state.eventFilter.type)
      }
      if (state.eventFilter.level) {
        result = result.filter(e => e.level === state.eventFilter.level)
      }
      return result
    },

    highRiskCount(state) {
      return state.events.filter(e => e.level === '高').length
    },

    mediumRiskCount(state) {
      return state.events.filter(e => e.level === '中').length
    },

    lowRiskCount(state) {
      return state.events.filter(e => e.level === '低').length
    },

    eventsByType(state) {
      const map = {}
      for (const e of state.events) {
        if (!map[e.type]) map[e.type] = []
        map[e.type].push(e)
      }
      return map
    },

    brentPrice(state) {
      return state.priceData?.current_prices?.brent?.price ?? null
    },

    wtiPrice(state) {
      return state.priceData?.current_prices?.wti?.price ?? null
    },

    riskIndex(state) {
      return state.statistics?.risk_index ?? null
    },

    oilfieldCount(state) {
      return state.infrastructure?.statistics?.monitored_oilfields ?? 0
    },

    tankerCount(state) {
      return state.infrastructure?.statistics?.tracked_tankers ?? 0
    }
  },

  actions: {
    // 设置过滤器
    setEventFilter(filter) {
      this.eventFilter = { ...this.eventFilter, ...filter }
    },

    resetEventFilter() {
      this.eventFilter = { region: null, type: null, level: null }
    },

    // 获取风险事件
    async fetchEvents(params = {}) {
      this.eventsLoading = true
      try {
        const response = await getOilEvents(params)
        if (response.data) {
          this.events = response.data.events || []
          this.statistics = {
            total_events: response.data.count,
            type_counts: response.data.type_counts,
            level_counts: response.data.level_counts,
            region_counts: response.data.region_counts
          }
        }
      } catch (error) {
        console.error('获取石油风险事件失败:', error)
      } finally {
        this.eventsLoading = false
      }
    },

    // 获取统计
    async fetchStatistics() {
      try {
        const response = await getOilStatistics()
        if (response.data) {
          this.statistics = response.data
        }
      } catch (error) {
        console.error('获取石油统计失败:', error)
      }
    },

    // 获取基础设施
    async fetchInfrastructure(category = null) {
      this.infrastructureLoading = true
      try {
        const response = await getOilInfrastructure(category)
        if (response.data) {
          this.infrastructure = response.data
        }
      } catch (error) {
        console.error('获取石油基础设施失败:', error)
      } finally {
        this.infrastructureLoading = false
      }
    },

    // 获取地图要素
    async fetchMapFeatures() {
      this.mapFeaturesLoading = true
      try {
        const response = await getOilMapFeatures()
        if (response.data) {
          this.mapFeatures = response.data
        }
      } catch (error) {
        console.error('获取地图要素失败:', error)
      } finally {
        this.mapFeaturesLoading = false
      }
    },

    // 获取价格
    async fetchPrices(benchmark = null) {
      this.priceLoading = true
      try {
        const response = await getOilPrices(benchmark)
        if (response.data) {
          this.priceData = response.data
        }
      } catch (error) {
        console.error('获取价格数据失败:', error)
      } finally {
        this.priceLoading = false
      }
    },

    // 获取市场概览
    async fetchMarketOverview() {
      this.marketOverviewLoading = true
      try {
        const response = await getOilMarketOverview()
        if (response.data) {
          this.marketOverview = response.data
          // 同步更新子状态
          if (response.data.current_prices) {
            this.priceData = this.priceData || {}
            this.priceData.current_prices = response.data.current_prices
          }
          if (response.data.risk_statistics) {
            this.statistics = response.data.risk_statistics
          }
          if (response.data.opec_production) {
            this.opecData = response.data.opec_production
          }
          if (response.data.spr_data) {
            this.sprData = response.data.spr_data
          }
        }
      } catch (error) {
        console.error('获取市场概览失败:', error)
      } finally {
        this.marketOverviewLoading = false
      }
    },

    // 获取新闻
    async fetchNews() {
      this.newsLoading = true
      try {
        const response = await getOilNews()
        if (response.data) {
          this.newsList = response.data.news || []
        }
      } catch (error) {
        console.error('获取新闻失败:', error)
      } finally {
        this.newsLoading = false
      }
    },

    // 获取 OPEC 数据
    async fetchOpecData() {
      try {
        const response = await getOilOpecProduction()
        if (response.data) {
          this.opecData = response.data
        }
      } catch (error) {
        console.error('获取 OPEC 数据失败:', error)
      }
    },

    // 获取 SPR 数据
    async fetchSprData() {
      try {
        const response = await getOilSprData()
        if (response.data) {
          this.sprData = response.data
        }
      } catch (error) {
        console.error('获取 SPR 数据失败:', error)
      }
    },

    // 生成报告
    async generateReport(query, topic = null) {
      this.reportLoading = true
      this.reportResult = null
      try {
        const response = await analyzeOilReport({ query, topic })
        if (response.data) {
          this.reportResult = response.data
        }
        return response.data
      } catch (error) {
        console.error('生成分析报告失败:', error)
        throw error
      } finally {
        this.reportLoading = false
      }
    },

    // 获取报告知识库
    async fetchReportKnowledge(topic = null) {
      try {
        const response = await getOilReportKnowledge(topic)
        if (response.data) {
          this.reportKnowledge = response.data
        }
        return response.data
      } catch (error) {
        console.error('获取报告知识库失败:', error)
      }
    },

    // 初始化加载所有数据
    async initAll() {
      await Promise.allSettled([
        this.fetchEvents(),
        this.fetchInfrastructure(),
        this.fetchMapFeatures(),
        this.fetchPrices(),
        this.fetchNews(),
        this.fetchMarketOverview()
      ])
      this.lastFetchTime = new Date().toISOString()
    },

    // 刷新所有数据
    async refreshAll() {
      this.lastFetchTime = null
      await this.initAll()
    }
  }
})
