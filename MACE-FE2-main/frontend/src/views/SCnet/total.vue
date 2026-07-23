<template>
  <div class="entrance-container">
    <!-- 粒子背景 -->
    <div class="particles">
      <div v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>

    <div class="entrance-content">
      <!-- 头部 -->
      <div class="entrance-header">
        <h1 class="entrance-title">供应链仿真</h1>
        <p class="entrance-subtitle">选择分析阶段，进入对应的推演工作流</p>
        <div class="entrance-underline"></div>
      </div>

      <!-- 三张场景卡片 -->
      <div class="entrance-cards">
        <el-card
          v-for="card in sceneCards"
          :key="card.id"
          class="scene-card click-card"
          shadow="hover"
          @click="navigateToPhase(card.phaseKey)"
        >
          <div :class="card.bgClass"></div>
          <div class="scene-card-header">
            <span class="scene-card-icon">{{ card.icon }}</span>
            <span class="scene-card-name">{{ card.name }}</span>
          </div>
          <div class="scene-card-desc">{{ card.desc }}</div>
          <div class="scene-card-footer">
            <span class="scene-card-tag">{{ card.tag }}</span>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'

const PHASE_STORAGE_KEY = 'scnet_phaseSelection'
const PHASE_EVENT = 'scnetPhaseSelectionChanged'

const PHASE_ROUTES = {
  pre: '/home/SCnet/situationAnalysis',
  during: '/home/SCnet/scenarioModeling',
  post: '/home/SCnet/counterfactualExperiment'
}

export default {
  name: 'TotalPage',
  setup() {
    const router = useRouter()

    const getParticleStyle = (i) => ({
      left: `${(i * 37) % 100}%`,
      top: `${(i * 53) % 100}%`,
      animationDelay: `${(i % 8) * 0.4}s`,
      animationDuration: `${5 + (i % 5)}s`
    })

    const navigateToPhase = (phase) => {
      localStorage.setItem(PHASE_STORAGE_KEY, phase)
      window.dispatchEvent(new CustomEvent(PHASE_EVENT, { detail: phase }))
      const route = PHASE_ROUTES[phase] || '/home/SCnet/situationAnalysis'
      router.push(route)
    }

    return { getParticleStyle, navigateToPhase }
  },
  data() {
    return {
      sceneCards: [
        {
          id: 1,
          phaseKey: 'pre',
          name: '事前：风险识别与预警',
          desc: '基于供应链全链路数据（矿山、物流、化工、政策），识别潜在中断风险点（地缘政治、自然灾害、需求波动等），进行风险量化评估，提前制定备选方案与安全库存策略。',
          icon: '🔍',
          tag: '先知先觉 · 防患未然',
          bgClass: 'card-bg-pre'
        },
        {
          id: 2,
          phaseKey: 'during',
          name: '事中：应急响应与调度',
          desc: '当供应链中断事件发生时，快速启动应急机制，动态调配替代供应商、调整物流路线、释放应急库存，实现分钟级响应，最大限度保障业务连续性。',
          icon: '⚡',
          tag: '实时响应 · 精准调度',
          bgClass: 'card-bg-during'
        },
        {
          id: 3,
          phaseKey: 'post',
          name: '事后：复盘优化与重构',
          desc: '对供应链中断事件进行深度复盘，分析根因与响应时效，优化供应商评估模型、库存策略与应急预案，构建更具韧性的供应链网络。',
          icon: '📈',
          tag: '深度复盘 · 韧性重构',
          bgClass: 'card-bg-post'
        }
      ]
    }
  }
}
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.entrance-container {
  height: 100%; min-height: 0;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 48%, #eff6ff 100%);
  position: relative; display: flex; align-items: center; justify-content: center;
  font-family: 'Inter', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 2rem; overflow: hidden;
}

/* 粒子 */
.particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.particle {
  position: absolute; width: 6px; height: 6px; border-radius: 999px;
  background: rgba(37, 99, 235, 0.22);
  animation: floatParticle linear infinite;
}
@keyframes floatParticle {
  0% { transform: translateY(0) scale(1); opacity: 0.2; }
  50% { transform: translateY(-36px) scale(1.4); opacity: 0.8; }
  100% { transform: translateY(-72px) scale(1); opacity: 0.2; }
}

.entrance-content {
  max-width: 960px; width: 100%; position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 2rem;
}

/* 头部 */
.entrance-header { text-align: center; }
.entrance-title {
  font-size: 2rem; font-weight: 900; letter-spacing: 8px;
  background: linear-gradient(145deg, #3B82F6 0%, #60A5FA 25%, #2563EB 50%, #3B82F6 75%, #60A5FA 100%);
  background-clip: text; -webkit-background-clip: text; color: transparent;
  margin-bottom: 0.4rem;
}
.entrance-subtitle { font-size: 0.9rem; color: #64748B; letter-spacing: 1px; font-weight: 500; margin-bottom: 0.4rem; }
.entrance-underline { width: 80px; height: 3px; background: linear-gradient(90deg, #2563EB, #38BDF8); margin: 0 auto; border-radius: 2px; }

/* 卡片 */
.entrance-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; width: 100%; }

.scene-card {
  border-radius: 18px; border: 1px solid #e2e8f0; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  position: relative; overflow: hidden;
  background: #fff; padding: 1.2rem 1rem;
  min-height: 230px; display: flex; flex-direction: column;
}
.scene-card:hover {
  transform: translateY(-4px);
  border-color: #93c5fd;
  box-shadow: 0 12px 28px -8px rgba(37, 99, 235, 0.15);
}

/* 卡片背景装饰 */
.card-bg-pre {
  position: absolute; top: -20px; right: -20px; width: 100px; height: 100px;
  border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.card-bg-during {
  position: absolute; top: -20px; right: -20px; width: 100px; height: 100px;
  border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.card-bg-post {
  position: absolute; top: -20px; right: -20px; width: 100px; height: 100px;
  border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%);
  pointer-events: none;
}

.scene-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.7rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; position: relative; z-index: 1; }
.scene-card-icon { font-size: 1.3rem; }
.scene-card-name { font-size: 0.95rem; font-weight: 700; color: #1E293B; }
.scene-card-desc { color: #64748B; line-height: 1.5; font-size: 0.8rem; flex: 1; position: relative; z-index: 1; }
.scene-card-footer { margin-top: auto; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; text-align: center; position: relative; z-index: 1; }
.scene-card-tag { font-size: 0.75rem; font-weight: 600; color: #2563EB; background: #EFF6FF; padding: 0.1rem 0.5rem; border-radius: 10px; }

@media (max-width: 768px) {
  .entrance-cards { grid-template-columns: 1fr; }
  .entrance-title { font-size: 1.5rem; }
}
</style>
