import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  SCENARIO_STORAGE_KEY, SCENARIO_EVENT,
  SCENARIO_VALUES, SCENARIO_LABELS
} from '@/constants/scnetScenario'

export const useScenarioStore = defineStore('scenario', () => {
  // 从 localStorage 读取初始值，默认铀供应链
  const currentScenario = ref(
    localStorage.getItem(SCENARIO_STORAGE_KEY) || SCENARIO_VALUES.URANIUM
  )

  // 中文标签
  const label = computed(() =>
    SCENARIO_LABELS[currentScenario.value] || '铀供应链'
  )

  // 便捷判断
  const isSupplyChain = computed(() =>
    currentScenario.value === SCENARIO_VALUES.SUPPLY_CHAIN
  )
  const isUranium = computed(() =>
    currentScenario.value === SCENARIO_VALUES.URANIUM
  )

  // 用户最新输入的问题（供报告生成等页面使用）
  const lastUserMessage = ref(localStorage.getItem('scnet_lastUserMessage') || '')

  function setLastUserMessage(msg) {
    lastUserMessage.value = msg
    localStorage.setItem('scnet_lastUserMessage', msg)
  }

  // 切换场景
  function setScenario(value) {
    if (![SCENARIO_VALUES.URANIUM, SCENARIO_VALUES.SUPPLY_CHAIN].includes(value)) return
    currentScenario.value = value
    localStorage.setItem(SCENARIO_STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent(SCENARIO_EVENT, { detail: value }))
  }

  function toggleScenario() {
    setScenario(isSupplyChain.value ? SCENARIO_VALUES.URANIUM : SCENARIO_VALUES.SUPPLY_CHAIN)
  }

  // 跨标签页同步（与其他浏览器标签保持场景一致）
  window.addEventListener('storage', (e) => {
    if (e.key === SCENARIO_STORAGE_KEY && e.newValue) {
      currentScenario.value = e.newValue
    }
  })

  return {
    currentScenario,
    label,
    isSupplyChain,
    isUranium,
    lastUserMessage,
    setScenario,
    setLastUserMessage,
    toggleScenario
  }
})
