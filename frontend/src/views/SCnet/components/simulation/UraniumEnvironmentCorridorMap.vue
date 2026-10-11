<template>
  <div class="env-corridor-map-root glass-panel">
    <!-- 顶栏状态与说明 -->
    <header class="ecm-header">
      <div class="ecm-title-group">
        <div class="ecm-badge-row">
          <span class="ecm-tag natural">🌿 自然物理环境</span>
          <span class="ecm-tag social">🏛️ 社会地缘制度</span>
          <el-tag size="small" type="success" effect="dark">动态孪生沙盘</el-tag>
        </div>
        <h3>全球陆海战略走廊与地缘环境数字孪生沙盘</h3>
        <p class="ecm-subtitle">
          解耦空间自然地理航道（水文航期/海峡咽喉/口岸换轨）与社会制度规制（次级制裁/长协担保/金融结算），支撑外部动态条件实时驱动。
        </p>
      </div>

      <div class="ecm-header-stats">
        <div class="stat-pill natural">
          <small>自然走廊</small>
          <strong>3 条在役</strong>
          <span>海运1 · 陆运1 · 铁海联运1</span>
        </div>
        <div class="stat-pill social">
          <small>地缘制裁场</small>
          <strong>{{ (conditions.geoSanctionSeverity * 100).toFixed(0) }}% 烈度</strong>
          <span>涉俄次级脱钩管制区</span>
        </div>
        <div class="stat-pill kpi">
          <small>态势输入 S(t)</small>
          <strong>{{ computedSVal }}</strong>
          <span :style="{ color: computedSVal >= 0.75 ? '#f43f5e' : '#10b981' }">
            {{ computedSVal >= 0.75 ? '已触发应急保供' : '处于稳态运行' }}
          </span>
        </div>
      </div>
    </header>

    <!-- 交互式 SVG 宏观环境态势沙盘画布 -->
    <div class="ecm-canvas-wrap">
      <svg
        class="ecm-svg-canvas"
        viewBox="0 0 1000 480"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <!-- 渐变定义 -->
          <linearGradient id="seaCorridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" :stop-color="seaStatusColor" stop-opacity="0.9" />
            <stop offset="50%" :stop-color="seaStatusColor" stop-opacity="0.7" />
            <stop offset="100%" :stop-color="seaStatusColor" stop-opacity="0.95" />
          </linearGradient>

          <linearGradient id="landCorridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" :stop-color="landStatusColor" stop-opacity="0.9" />
            <stop offset="100%" :stop-color="landStatusColor" stop-opacity="0.9" />
          </linearGradient>

          <linearGradient id="titrCorridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#a855f7" stop-opacity="0.8" />
          </linearGradient>

          <!-- 滤镜发光 -->
          <filter id="corridorGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="sanctionHeatGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <!-- 流光箭头标记 -->
          <marker id="seaArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" :fill="seaStatusColor" />
          </marker>
          <marker id="landArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" :fill="landStatusColor" />
          </marker>
        </defs>

        <!-- 背景经纬网格与宏观地缘大区底色 -->
        <g class="ecm-grid-bg" opacity="0.35">
          <line x1="50" y1="80" x2="950" y2="80" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="50" y1="160" x2="950" y2="160" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="50" y1="240" x2="950" y2="240" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="50" y1="320" x2="950" y2="320" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="50" y1="400" x2="950" y2="400" stroke="#334155" stroke-dasharray="4,4" />

          <line x1="180" y1="40" x2="180" y2="440" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="380" y1="40" x2="380" y2="440" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="580" y1="40" x2="580" y2="440" stroke="#334155" stroke-dasharray="4,4" />
          <line x1="780" y1="40" x2="780" y2="440" stroke="#334155" stroke-dasharray="4,4" />

          <text x="60" y="70" fill="#64748b" font-size="10" font-family="monospace">LAT 60°N · 欧亚地缘制裁高压区</text>
          <text x="60" y="230" fill="#64748b" font-size="10" font-family="monospace">LAT 0° (赤道) · 关键海峡通航咽喉</text>
          <text x="60" y="390" fill="#64748b" font-size="10" font-family="monospace">LAT 35°S · 南非远洋好望角深水走廊</text>
        </g>

        <!-- ================= 🏛️ 社会制度环境层 (制裁与主权长协区) ================= -->
        <!-- 1. 欧美涉俄核燃料次级制裁管控区 (红粉危险场) -->
        <g class="ecm-regime-area sanction-regime">
          <path
            d="M 120 70 L 460 70 L 480 180 L 320 200 L 100 150 Z"
            fill="rgba(239, 68, 68, 0.08)"
            stroke="rgba(239, 68, 68, 0.4)"
            stroke-width="1.5"
            stroke-dasharray="6,4"
            filter="url(#sanctionHeatGlow)"
          />
          <text x="140" y="100" fill="#f87171" font-size="11" font-weight="700">🏛️ 美欧次级制裁与涉俄脱钩管制区</text>
          <text x="140" y="118" fill="#fda4af" font-size="9">
            法案: 美欧两用物项禁运清单 · 扰动指数 R_geo(t) = {{ conditions.geoSanctionSeverity }}
          </text>
          <text x="140" y="132" fill="#94a3b8" font-size="9">
            影响: 中亚陆运涉俄线路过境审批延滞 · SWIFT 现货信用证审核延长 12 天
          </text>
        </g>

        <!-- 2. 中非/中哈主权战略长协保障区 (青绿法律护盾区) -->
        <g class="ecm-regime-area sovereign-regime">
          <!-- 非洲长协区 -->
          <rect
            x="70"
            y="260"
            width="220"
            height="140"
            rx="10"
            fill="rgba(16, 185, 129, 0.07)"
            stroke="rgba(16, 185, 129, 0.4)"
            stroke-width="1.5"
            stroke-dasharray="5,3"
          />
          <text x="85" y="285" fill="#34d399" font-size="11" font-weight="700">🏛️ 中非双边战略核能长协保障区</text>
          <text x="85" y="302" fill="#a7f3d0" font-size="9">
            协议: 纳米比亚湖山铀矿自主控股长协框架
          </text>
          <text x="85" y="316" fill="#94a3b8" font-size="9">
            机制: 锁定 65% 基准份额 · 主权违约惩罚敞口 λ₃ = 0.25
          </text>

          <!-- 中亚主权合作区 -->
          <rect
            x="360"
            y="110"
            width="210"
            height="100"
            rx="8"
            fill="rgba(56, 189, 248, 0.06)"
            stroke="rgba(56, 189, 248, 0.35)"
            stroke-width="1"
            stroke-dasharray="4,3"
          />
          <text x="375" y="132" fill="#38bdf8" font-size="11" font-weight="700">🏛️ 中哈政府间战略能源协议区</text>
          <text x="375" y="148" fill="#bae6fd" font-size="9">
            基线: Katco / Inkai 矿区稳定供货协议
          </text>
          <text x="375" y="162" fill="#94a3b8" font-size="9">
            结算: 跨境非美人民币/坚戈双边本币清算
          </text>
        </g>

        <!-- ================= 🌿 自然地理物理走廊层 (海运航道与铁路干线) ================= -->

        <!-- 走廊 03 · 跨里海中间走廊 TITR 铁海联运 (备选走廊) -->
        <g class="ecm-corridor corridor-titr">
          <path
            d="M 400 155 Q 360 170 330 190 T 260 210"
            fill="none"
            stroke="url(#titrCorridorGrad)"
            stroke-width="2.5"
            stroke-dasharray="6,4"
            class="route-line-animated"
          />
          <text x="270" y="195" fill="#c084fc" font-size="9" font-weight="600">TITR 跨里海多式联运 (备选 38天)</text>
        </g>

        <!-- 走廊 02 · 中哈铁路跨境陆运走廊 (阿拉山口) -->
        <g class="ecm-corridor corridor-land">
          <!-- 航道阴影/高亮层 -->
          <path
            d="M 430 145 L 530 155 L 640 165 L 750 170"
            fill="none"
            :stroke="landStatusColor"
            stroke-width="5"
            stroke-linecap="round"
            filter="url(#corridorGlow)"
            opacity="0.85"
          />
          <!-- 动态流动列车粒子 -->
          <path
            d="M 430 145 L 530 155 L 640 165 L 750 170"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-dasharray="10,25"
            class="train-flow-dash"
            marker-end="url(#landArrow)"
          />

          <!-- 陆运走廊沿线标牌 -->
          <g transform="translate(545, 130)">
            <rect x="0" y="0" width="165" height="26" rx="4" fill="rgba(15, 23, 42, 0.85)" :stroke="landStatusColor" stroke-width="1" />
            <text x="8" y="13" fill="#e2e8f0" font-size="9" font-weight="700">中欧班列中哈铁路走廊 (4,200km)</text>
            <text x="8" y="22" :fill="landStatusColor" font-size="8">
              时效: 15–18天 · 负荷率: {{ conditions.alashankouCongestion }}% ({{ conditions.alashankouCongestion > 90 ? '换轨高危' : '畅通' }})
            </text>
          </g>
        </g>

        <!-- 走廊 01 · 远洋深水海运走廊 (好望角-马六甲) -->
        <g class="ecm-corridor corridor-sea">
          <!-- 海运主航线曲线 -->
          <path
            d="M 170 330 Q 220 420 330 420 T 520 380 Q 640 330 680 280 T 780 230 L 840 215"
            fill="none"
            :stroke="seaStatusColor"
            stroke-width="6"
            stroke-linecap="round"
            filter="url(#corridorGlow)"
            opacity="0.9"
          />
          <!-- 动态海运货轮粒子流 -->
          <path
            d="M 170 330 Q 220 420 330 420 T 520 380 Q 640 330 680 280 T 780 230 L 840 215"
            fill="none"
            stroke="#ffffff"
            stroke-width="2.5"
            stroke-dasharray="15,40"
            class="ship-flow-dash"
            marker-end="url(#seaArrow)"
          />

          <!-- 好望角咽喉标牌 -->
          <g transform="translate(260, 425)">
            <rect x="0" y="0" width="145" height="22" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#64748b" stroke-width="1" />
            <text x="6" y="11" fill="#cbd5e1" font-size="8" font-weight="600">好望角航道 · 深水吃水 22m</text>
            <text x="6" y="19" fill="#94a3b8" font-size="7">规避冲突险区 · 散货专运</text>
          </g>

          <!-- 马六甲海峡咽喉标牌 (动态通畅度) -->
          <g transform="translate(620, 310)">
            <rect x="0" y="0" width="160" height="34" rx="5" fill="rgba(15, 23, 42, 0.9)" :stroke="seaStatusColor" stroke-width="1.2" />
            <text x="8" y="13" fill="#f8fafc" font-size="9" font-weight="700">马六甲海峡咽喉 (关键枢纽)</text>
            <text x="8" y="23" :fill="seaStatusColor" font-size="8">
              通畅度: {{ conditions.corridorSeaOpenness }}% ({{ conditions.corridorSeaOpenness < 60 ? '通航受阻' : '正常通航' }})
            </text>
            <text x="8" y="31" fill="#94a3b8" font-size="7">
              航期延误: +{{ conditions.portMonsoonDelayDays }}天 · 保费上浮 +{{ conditions.insuranceSurgeRate }}%
            </text>
          </g>
        </g>

        <!-- ================= 📍 关键地理节点与口岸港口 ================= -->

        <!-- 节点 1: 非洲纳米比亚鲸湾港 (矿山出海口) -->
        <g class="ecm-node" transform="translate(170, 330)" @click="selectEnvNode('walvis')">
          <circle r="9" fill="#10b981" stroke="#ffffff" stroke-width="2" />
          <circle r="14" fill="none" stroke="#10b981" stroke-width="1" stroke-dasharray="3,3" class="pulse-ring" />
          <text x="-25" y="-14" fill="#6ee7b7" font-size="10" font-weight="700">鲸湾港 (Walvis Bay)</text>
          <text x="-25" y="-4" fill="#94a3b8" font-size="8">自主矿山出海专用码头</text>
        </g>

        <!-- 节点 2: 中亚哈萨克斯坦矿区与阿克套 -->
        <g class="ecm-node" transform="translate(425, 145)" @click="selectEnvNode('aktau')">
          <circle r="8" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
          <text x="-55" y="-12" fill="#7dd3fc" font-size="10" font-weight="700">中亚矿区 / 阿克套港</text>
          <text x="-55" y="-2" fill="#94a3b8" font-size="8">原位浸出基地 · 铁路编组站</text>
        </g>

        <!-- 节点 3: 阿拉山口铁路口岸 (中欧班列第一咽喉) -->
        <g class="ecm-node" transform="translate(635, 165)" @click="selectEnvNode('alashankou')">
          <circle r="9" :fill="landStatusColor" stroke="#ffffff" stroke-width="2" />
          <circle r="15" fill="none" :stroke="landStatusColor" stroke-width="1" stroke-dasharray="3,3" class="pulse-ring" />
          <text x="-35" y="-15" fill="#fde047" font-size="10" font-weight="700">阿拉山口口岸</text>
          <text x="-35" y="-5" fill="#cbd5e1" font-size="8">负荷率: {{ conditions.alashankouCongestion }}% (准轨换宽轨)</text>
        </g>

        <!-- 节点 4: 华南防城港 / 华东连云港 (Class 7 海运接卸港) -->
        <g class="ecm-node" transform="translate(830, 245)" @click="selectEnvNode('ports')">
          <circle r="9" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
          <circle r="15" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,3" class="pulse-ring" />
          <text x="14" y="2" fill="#38bdf8" font-size="10" font-weight="700">连云港 / 防城港</text>
          <text x="14" y="14" fill="#94a3b8" font-size="8">深水 Class 7 放射性专用泊位</text>
        </g>

        <!-- 节点 5: 北方包头燃料制造转化基地 -->
        <g class="ecm-node" transform="translate(755, 170)" @click="selectEnvNode('baotou')">
          <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#a855f7" stroke="#ffffff" stroke-width="2" />
          <text x="14" y="-3" fill="#c084fc" font-size="10" font-weight="700">中核北方包头制造基地</text>
          <text x="14" y="9" fill="#fda4af" font-size="8">第一制造枢纽 · 在役库存 14周红线</text>
        </g>

        <!-- 节点 6: 沿海华龙一号核电机组运营群 -->
        <g class="ecm-node" transform="translate(880, 210)" @click="selectEnvNode('nuclear')">
          <circle r="8" fill="#ec4899" stroke="#ffffff" stroke-width="2" />
          <text x="12" y="-2" fill="#f472b6" font-size="10" font-weight="700">全国在役与示范核电机组群</text>
          <text x="12" y="10" fill="#94a3b8" font-size="8">华龙一号示范工程 · 0非停刚性保供</text>
        </g>
      </svg>
    </div>

    <!-- 交互提示与当前选中节点详情抽屉栏 -->
    <footer class="ecm-footer-bar">
      <div class="ecm-legend-row">
        <span class="legend-item"><i class="legend-dot normal"></i> 自然海运走廊 (正常畅通)</span>
        <span class="legend-item"><i class="legend-dot warning"></i> 运力承压 / 时滞延误</span>
        <span class="legend-item"><i class="legend-dot danger"></i> 高危阻断 / 负荷超限</span>
        <span class="legend-item"><i class="legend-dot shield-safe"></i> 双边主权长协保障区</span>
        <span class="legend-item"><i class="legend-dot shield-danger"></i> 次级制裁脱钩管控区</span>
      </div>
      <div class="ecm-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>调节下方动态滑块或预设情景，沙盘航线颜色、时滞天数与通畅度将实时联动更新。</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  conditions: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['selectNode'])

const seaStatusColor = computed(() => {
  const openness = props.conditions.corridorSeaOpenness
  if (openness >= 80) return '#10b981' // 正常畅通 (翡翠绿)
  if (openness >= 60) return '#fbbf24' // 承压 (琥珀黄)
  return '#f43f5e' // 阻断高危 (玫瑰红)
})

const landStatusColor = computed(() => {
  const congestion = props.conditions.alashankouCongestion
  if (congestion <= 75) return '#38bdf8' // 稳态 (天蓝)
  if (congestion <= 90) return '#fbbf24' // 负荷承压 (琥珀黄)
  return '#f43f5e' // 拥堵破线 (玫瑰红)
})

const computedSVal = computed(() => {
  const rGeo = props.conditions.geoSanctionSeverity * 0.5 + props.conditions.swiftSettlementFriction * 0.3 + (props.conditions.insuranceSurgeRate / 50) * 0.2
  const sea = props.conditions.corridorSeaOpenness / 100
  const land = 1 - (props.conditions.alashankouCongestion / 100)
  const cCorridor = sea * 0.6 + land * 0.4
  return Number((0.4 * rGeo + 0.35 * (1 - cCorridor) + 0.25 * 0.70).toFixed(2))
})

function selectEnvNode(nodeKey) {
  emit('selectNode', nodeKey)
}
</script>

<style scoped>
.env-corridor-map-root {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.ecm-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.ecm-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ecm-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}
.ecm-tag.natural {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.ecm-tag.social {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.ecm-title-group h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
}

.ecm-subtitle {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  max-width: 620px;
  line-height: 1.5;
}

.ecm-header-stats {
  display: flex;
  gap: 10px;
}

.stat-pill {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  min-width: 100px;
}
.stat-pill.natural { border-color: rgba(16, 185, 129, 0.3); }
.stat-pill.social { border-color: rgba(239, 68, 68, 0.3); }
.stat-pill.kpi { border-color: rgba(56, 189, 248, 0.4); }

.stat-pill small {
  font-size: 10px;
  color: #94a3b8;
}
.stat-pill strong {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  margin: 1px 0;
}
.stat-pill span {
  font-size: 9px;
  color: #64748b;
}

.ecm-canvas-wrap {
  width: 100%;
  background: radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
}

.ecm-svg-canvas {
  width: 100%;
  height: auto;
  display: block;
}

/* 动效 */
.ship-flow-dash {
  animation: shipFlowAnim 4s linear infinite;
}
@keyframes shipFlowAnim {
  to {
    stroke-dashoffset: -110;
  }
}

.train-flow-dash {
  animation: trainFlowAnim 2.5s linear infinite;
}
@keyframes trainFlowAnim {
  to {
    stroke-dashoffset: -70;
  }
}

.route-line-animated {
  animation: titrDash 6s linear infinite;
}
@keyframes titrDash {
  to {
    stroke-dashoffset: -50;
  }
}

.pulse-ring {
  animation: pulseAnim 2s ease-out infinite;
  transform-origin: center;
}
@keyframes pulseAnim {
  0% { transform: scale(0.9); opacity: 0.9; }
  100% { transform: scale(1.6); opacity: 0; }
}

.ecm-node {
  cursor: pointer;
  transition: transform 0.2s ease;
}
.ecm-node:hover {
  transform: scale(1.1);
}

.ecm-footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(51, 65, 85, 0.4);
  font-size: 11px;
  color: #94a3b8;
  flex-wrap: wrap;
  gap: 8px;
}

.ecm-legend-row {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot.normal { background: #10b981; }
.legend-dot.warning { background: #fbbf24; }
.legend-dot.danger { background: #f43f5e; }
.legend-dot.shield-safe { background: rgba(16, 185, 129, 0.8); border: 1px solid #10b981; }
.legend-dot.shield-danger { background: rgba(239, 68, 68, 0.8); border: 1px solid #f87171; }

.ecm-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #38bdf8;
  font-size: 11px;
}
</style>
