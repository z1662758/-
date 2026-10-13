<template>
  <section class="prb">
    <div class="prb-avatar"><img :src="logoUrl" alt="" /></div>
    <div class="prb-main">
      <h2 class="prb-title">事后复盘分析</h2>
      <p class="prb-lead">
        已进入<b>事后分析</b>阶段。针对<b>{{ scenarioLabel }}</b>，事后复盘围绕以下三个核心维度展开：
      </p>

      <div class="prb-dim">
        <h3>一、指标偏离与时滞复盘</h3>
        <p>梳理<b>外部扰动</b> &rarr; <b>指标响应</b> &rarr; <b>管控措施落地</b>之间的时间链</p>
        <p>量化各环节延迟（如<b>指标首次偏离</b>到<b>策略开始生效</b>之间的间隔）</p>
        <p>识别「<b>偏离信号被衰减</b>」的关键节点</p>
      </div>

      <div class="prb-dim">
        <h3>二、级联失效与因果链分析</h3>
        <p>可追踪的典型失效链条：</p>
        <div v-if="branches.length" class="prb-chain">
          <p v-for="(branch, index) in branches" :key="branch[0]" class="prb-chain-line">
            <template v-if="index === 0">
              <b>{{ chainRoot }}</b><span class="prb-chain-arrow">&rarr;</span>
            </template>
            <span class="prb-chain-node">{{ branch[0] }}</span>
            <span class="prb-chain-arrow">&rarr;</span>
            <span class="prb-chain-node is-effect">{{ branch[1] }}</span>
          </p>
        </div>
        <p>分析各节点之间的<b>传导机制</b>与缓冲失效原因</p>
        <p>区分「必然失效」与「可干预阻断」的环节</p>
      </div>

      <div class="prb-dim">
        <h3>三、反事实实验与干预对比</h3>
        <p>按本次实验方案在<b>成对世界</b>上跑事实 / 反事实两次实验，两个世界只差一个干预</p>
        <p>用同一基座（同种子、同轮次、同参数目录）量化干预的真实效果，不让仿真噪声冒充干预效应</p>
        <p>对比多组干预策略的指标变化，判定哪一组的改善在统计上显著</p>
      </div>

      <p class="prb-flow">
        实验要做的事：<b>确认实验目的 &rarr; 设计干预方案 &rarr; 运行反事实实验 &rarr; 观察 / 干预 / 机制分析 &rarr; 复盘报告</b>。
        右侧「事后复盘工作台」可随时查看进度与参数，并直接进入任一环节。
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import logoUrl from '@/assets/images/logo.png'

const props = defineProps({
  scenarioLabel: { type: String, default: '' },
  // { root: string, branches: string[][] } —— 只用本场景参数目录里真实存在的变量名
  chain: { type: Object, default: () => ({ root: '', branches: [] }) }
})

const chainRoot = computed(() => String(props.chain?.root || '外部扰动'))
const branches = computed(() => {
  const list = props.chain?.branches
  return Array.isArray(list) ? list.filter((branch) => Array.isArray(branch) && branch.length) : []
})
</script>

<style scoped>
.prb { display: flex; align-items: flex-start; gap: 14px; width: 100%; text-align: left; }
.prb-avatar { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; overflow: hidden; background: #eef2ff; margin-top: 2px; }
.prb-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; }
.prb-main { flex: 1; min-width: 0; }

.prb-title { margin: 0; font-size: 19px; font-weight: 700; color: #111827; letter-spacing: 0.2px; }
.prb-lead { margin: 12px 0 0; font-size: 14.5px; line-height: 1.75; color: #374151; }
.prb-lead b { color: #111827; font-weight: 700; }

/* 维度：标题大一号，正文用缩进的整段（参考口径不带项目符号） */
.prb-dim { margin-top: 22px; }
.prb-dim h3 { margin: 0 0 8px; font-size: 16.5px; font-weight: 700; color: #111827; }
.prb-dim p { margin: 0 0 6px; padding-left: 20px; font-size: 14px; line-height: 1.95; color: #374151; }
.prb-dim p:last-child { margin-bottom: 0; }
.prb-dim p b { color: #111827; font-weight: 700; }

/* 失效链条：浅灰圆角块 + 悬挂缩进，子链对齐在第二个节点下面 */
.prb-chain { margin: 10px 0 10px 20px; padding: 14px 18px; border-radius: 10px; background: #f5f6f8; }
.prb-chain-line { margin: 0; font-size: 13.5px; line-height: 2; color: #374151; }
.prb-chain-line + .prb-chain-line { padding-left: 6.4em; }
.prb-chain-line b { color: #111827; font-weight: 700; }
.prb-chain-node { color: #374151; }
.prb-chain-node.is-effect { color: #b45309; font-weight: 600; }
.prb-chain-arrow { margin: 0 8px; color: #9ca3af; }

.prb-flow { margin: 22px 0 0; padding: 12px 16px; border-radius: 10px; background: #f5f3ff; border: 1px dashed #ddd6fe; font-size: 13.5px; line-height: 1.8; color: #4b5563; }
.prb-flow b { color: #4338ca; font-weight: 700; }
</style>
