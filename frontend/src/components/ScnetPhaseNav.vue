<template>
  <div v-if="visible" class="scnet-phase-nav">
    <div class="spn-layer">
      <nav class="spn-group" aria-label="阶段快捷导航">
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          class="spn-btn"
          :class="{ 'is-active': item.active }"
          :aria-current="item.active ? 'page' : undefined"
          @click="onItemClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { writeScnetPhase } from '@/constants/scnetPhase'
import { SCNET_PHASE_ROUTE_MAP, SCNET_PHASE_SHORT_LABELS } from '@/constants/scnetStageMeta'

/**
 * 显示本导航的页面。
 *
 * 显式列举路径而没有复用 ROUTE_TO_PHASE：后者只登记了部分事前页面
 * （态势研判 / 结果校验 / 知识创建 / 石油三页等未登记），用它会漏页，
 * 于是这些页面就看不到导航。
 */
const PRE_ROUTE_PATHS = Object.freeze([
  '/home/SCnet/scenarioSetting',
  '/home/SCnet/planConfirmation',
  '/home/SCnet/situationJudge',
  '/home/SCnet/situationAnalysis',
  '/home/SCnet/situationResearch-main',
  '/home/SCnet/resultVerification',
  '/home/SCnet/reportGeneration',
  '/home/SCnet/openSourceIntelligence',
  '/home/SCnet/knowledgeBase',
  '/home/SCnet/knowledgeCreate',
  '/home/SCnet/knowledgeGraph',
  '/home/SCnet/DisruptRisk',
  '/home/SCnet/oilIntelligence',
  '/home/SCnet/oilSituationAnalysis',
  '/home/SCnet/oilReportGeneration'
])

/** 阶段选择页也放这组按钮；它不属于任何阶段，三个按钮都不置激活态 */
const PHASE_SELECT_PATH = '/home/SCnet/total'
const NAV_ROUTE_PATHS = Object.freeze([...PRE_ROUTE_PATHS, PHASE_SELECT_PATH])

// 阶段按钮的跳转目标与 /SCnet/total 上的三张阶段卡片完全一致（同一份常量）
const PHASE_ITEMS = Object.freeze([
  { key: 'pre', label: SCNET_PHASE_SHORT_LABELS.pre, path: SCNET_PHASE_ROUTE_MAP.pre },
  { key: 'during', label: SCNET_PHASE_SHORT_LABELS.during, path: SCNET_PHASE_ROUTE_MAP.during },
  { key: 'post', label: SCNET_PHASE_SHORT_LABELS.post, path: SCNET_PHASE_ROUTE_MAP.post }
])

// 知识库不再放在这里：入口已固定到左侧栏顶部（见 SCnetLayout 的「知识库」菜单项）
const route = useRoute()
const router = useRouter()

const visible = computed(() => NAV_ROUTE_PATHS.includes(route.path))
/** 当前所在模块：只有事前各页置「事前」为激活态；阶段选择页不置任何激活态 */
const activePhase = computed(() => (PRE_ROUTE_PATHS.includes(route.path) ? 'pre' : ''))

const items = computed(() => PHASE_ITEMS.map((item) => ({ ...item, active: item.key === activePhase.value })))

const onItemClick = (item) => {
  // 目标与阶段卡片完全一致（不带任务上下文查询串）：已在该入口则不再重复跳转
  if (route.fullPath === item.path) return
  // 与阶段卡片一致：先落阶段选择再跳转。事中入口 /chatHome?mode=during 不在
  // ROUTE_TO_PHASE 里，左侧菜单与顶部阶段徽标只能靠这里写入的阶段值。
  writeScnetPhase(item.key)
  router.push(item.path)
}
</script>

<style scoped>
.scnet-phase-nav,
.spn-layer {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spn-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spn-btn {
  box-sizing: border-box;
  height: 32px;
  padding: 0 18px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.spn-btn:hover {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px -2px rgba(37, 99, 235, 0.35);
}

.spn-btn:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.spn-btn.is-active {
  color: #2563eb;
  background: #eff6ff;
  border-color: #93c5fd;
  font-weight: 600;
  box-shadow: 0 1px 3px -1px rgba(37, 99, 235, 0.35);
}

.spn-btn.is-active:hover {
  background: #dbeafe;
}

/* 窄屏收紧按钮间距与内边距 */
@media (max-width: 900px) {
  .spn-group {
    gap: 4px;
  }
  .spn-btn {
    padding: 0 10px;
  }
}
</style>
