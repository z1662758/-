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
/*
 * 零高度锚点 + 绝对定位浮层：
 *   - 锚点是 .body-pos 的 flex 子项，flex: 0 0 auto + height: 0，不占高度，
 *     挂载与否都不推挤页面内容；滚动区域与底部 sticky 操作栏都不受影响；
 *   - 浮层绝对定位到锚点上方，只覆盖顶部原有留白；
 *   - 锚点 pointer-events: none，不拦截底下页面内容的点击与滚轮；
 *   - 锚点必须挂在 .scnet-router-host 之外，否则向上越出的部分会被 overflow 裁掉。
 *
 * 纵向位置（实测 1600×900，16 个事前页 + 阶段选择页）：
 *   锚点位置 = 内容区顶部 y=60，顶栏分界线正好压在这一行。
 *   分界线以下、各页面内容以上的留白深度（相对内容区顶部）：
 *     第 1..10 行（y=61..70）完全空白；
 *     第 11..12 行（y=71..72）个别页面已有首个卡片/面板的浅灰上边线；
 *     第 13 行起（y=73）石油情报页的滚动播报文字行开始。
 *   所以按钮带取 y=61..72：紧贴分界线下方，且不压分界线、不压任何文字。
 *   该带只有 12px 高，按「空间不足优先缩小按钮」处理：
 *   按钮外高 12px（height 10 + 上下 1px 描边）、字号 10px、间距 5px。
 *   定位方式决定了页面主体内容顶部 Y 坐标与加导航前完全一致，不会整体下移。
 *
 * z-index 2100：AppHeader 是 flex 子项且带内联 z-index: 2000（flex item 带 z-index 即成为
 * 层叠上下文）。按钮虽已完全落到分界线下方，仍保留该层级，避免被顶栏及其投影盖住上半行。
 */
.scnet-phase-nav {
  position: relative;
  z-index: 2100;
  flex: 0 0 auto;
  width: 100%;
  height: 0;
  min-height: 0;
  pointer-events: none;
}

.spn-layer {
  position: absolute;
  /* 内容区顶部 y=60 是顶栏分界线，+1px 让按钮从分界线下方开始 */
  top: 1px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 30;
}

.spn-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 5px;
  /* 只有按钮本身可点，浮层其余部分是透传的 */
  pointer-events: auto;
}

.spn-btn {
  height: 10px; /* + 上下 1px 描边 = 外高 12px，正好落在 y=61..72 的空白带内 */
  padding: 0 9px;
  font-family: inherit;
  font-size: 10px;
  line-height: 1;
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
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

/* 窄屏优先压缩间距与水平内边距；高度/纵向位置不动，避免压到分界线或页面内容 */
@media (max-width: 900px) {
  .spn-group {
    gap: 4px;
  }
  .spn-btn {
    padding: 0 7px;
  }
}
</style>
