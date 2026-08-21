<template>
  <div class="async-panel-placeholder glass-panel" :class="`variant-${variant}`">
    <div class="placeholder-copy">
      <span class="placeholder-pill"></span>
      <div class="placeholder-text">
        <strong>{{ title }}</strong>
        <span>{{ subtitle }}</span>
      </div>
    </div>

    <div v-if="variant === 'map'" class="preview-surface map-preview">
      <span class="preview-orb orb-a"></span>
      <span class="preview-orb orb-b"></span>
      <span class="preview-route route-a"></span>
      <span class="preview-route route-b"></span>
      <span class="preview-route route-c"></span>
      <span class="preview-port port-a"></span>
      <span class="preview-port port-b"></span>
      <span class="preview-port port-c"></span>
    </div>

    <div v-else-if="variant === 'graph'" class="preview-surface graph-preview">
      <span class="graph-node node-a"></span>
      <span class="graph-node node-b"></span>
      <span class="graph-node node-c"></span>
      <span class="graph-node node-d"></span>
      <span class="graph-link link-a"></span>
      <span class="graph-link link-b"></span>
      <span class="graph-link link-c"></span>
    </div>

    <div v-else-if="variant === 'timeline'" class="preview-surface timeline-preview">
      <span v-for="(width, index) in timelineWidths" :key="`tick-${index}`" class="timeline-tick" :style="{ width }"></span>
    </div>

    <div v-else-if="variant === 'chart'" class="preview-surface chart-preview">
      <span v-for="(height, index) in chartHeights" :key="`bar-${index}`" class="chart-bar" :style="{ height }"></span>
    </div>

    <div v-else class="preview-surface list-preview">
      <span v-for="(width, index) in listWidths" :key="`row-${index}`" class="list-row" :style="{ width }"></span>
    </div>
  </div>
</template>

<script setup>
const { title, subtitle, variant } = defineProps({
  title: {
    type: String,
    default: '组件加载中'
  },
  subtitle: {
    type: String,
    default: '正在按容器尺寸预热资源'
  },
  variant: {
    type: String,
    default: 'panel'
  }
})

const chartHeights = ['34%', '56%', '46%', '74%', '62%', '88%']
const listWidths = ['88%', '72%', '94%', '66%']
const timelineWidths = ['11%', '15%', '13%', '17%', '12%', '15%', '10%']
</script>

<style scoped>
.async-panel-placeholder {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 251, 255, 0.92));
}

.async-panel-placeholder::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 18%, rgba(255, 255, 255, 0.5) 42%, transparent 66%);
  transform: translateX(-100%);
  animation: placeholder-sweep 2.8s ease-in-out infinite;
  pointer-events: none;
}

.placeholder-copy {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.placeholder-pill {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.12);
  flex-shrink: 0;
}

.placeholder-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.placeholder-text strong {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.placeholder-text span {
  font-size: 12px;
  color: #64748b;
}

.preview-surface {
  flex: 1;
  min-height: 0;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  z-index: 1;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.88), rgba(219, 234, 254, 0.56));
  border: 1px solid rgba(147, 197, 253, 0.3);
}

.map-preview::before,
.graph-preview::before,
.chart-preview::before,
.timeline-preview::before,
.list-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}

.preview-orb,
.preview-port,
.graph-node {
  position: absolute;
  border-radius: 999px;
}

.preview-orb {
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.orb-a {
  inset: 12% auto auto 16%;
  width: 32%;
  height: 24%;
}

.orb-b {
  inset: 36% 12% auto auto;
  width: 42%;
  height: 30%;
}

.preview-route {
  position: absolute;
  height: 2px;
  border-radius: 999px;
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0), rgba(37, 99, 235, 0.92), rgba(37, 99, 235, 0));
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.22);
  animation: route-breathe 2.6s ease-in-out infinite;
}

.route-a {
  width: 42%;
  left: 18%;
  top: 38%;
  transform: rotate(-14deg);
}

.route-b {
  width: 34%;
  left: 44%;
  top: 50%;
  transform: rotate(16deg);
  animation-delay: 0.5s;
}

.route-c {
  width: 26%;
  left: 28%;
  top: 62%;
  transform: rotate(6deg);
  animation-delay: 1s;
}

.preview-port {
  width: 12px;
  height: 12px;
  background: #2563eb;
  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.1);
}

.port-a { left: 18%; top: 34%; }
.port-b { left: 58%; top: 44%; }
.port-c { left: 46%; top: 66%; }

.graph-node {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1);
}

.node-a { left: 18%; top: 30%; }
.node-b { left: 58%; top: 20%; }
.node-c { left: 34%; top: 62%; }
.node-d { left: 74%; top: 58%; }

.graph-link {
  position: absolute;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.88), rgba(14, 165, 233, 0.12));
  transform-origin: left center;
}

.link-a {
  width: 42%;
  left: 20%;
  top: 34%;
  transform: rotate(-12deg);
}

.link-b {
  width: 32%;
  left: 36%;
  top: 48%;
  transform: rotate(26deg);
}

.link-c {
  width: 24%;
  left: 50%;
  top: 34%;
  transform: rotate(58deg);
}

.chart-preview {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 18px;
  gap: 10px;
}

.chart-bar {
  flex: 1;
  min-height: 28%;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.9), rgba(96, 165, 250, 0.28));
}

.list-preview {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 18px;
}

.list-row {
  display: block;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.18), rgba(191, 219, 254, 0.8), rgba(148, 163, 184, 0.18));
}

.timeline-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px;
}

.timeline-tick {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.2), rgba(37, 99, 235, 0.75));
}

@keyframes placeholder-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes route-breathe {
  0%, 100% { opacity: 0.42; transform: scaleX(0.96) translateZ(0); }
  50% { opacity: 1; transform: scaleX(1.04) translateZ(0); }
}
</style>
