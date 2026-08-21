import { SCNET_ROUTES } from '@/constants/scnetRoutes'

export const SCNET_PHASE_LABELS = Object.freeze({
  pre: '事前 · 风险识别与预警',
  during: '事中 · 应急响应与调度',
  post: '事后 · 复盘优化与重构'
})

export const SCNET_PHASE_TITLES = Object.freeze({
  pre: '事前：风险识别与预警',
  during: '事中：应急响应与调度',
  post: '事后：复盘优化与重构'
})

export const SCNET_PHASE_SHORT_LABELS = Object.freeze({
  pre: '事前',
  during: '事中',
  post: '事后'
})

export const SCNET_PHASE_ROUTE_MAP = Object.freeze({
  pre: SCNET_ROUTES.situationAnalysis,
  during: SCNET_ROUTES.duringEntry,
  post: SCNET_ROUTES.counterfactualExperiment
})

export const SCNET_PHASE_CARDS = Object.freeze([
  {
    id: 1,
    phaseKey: 'pre',
    name: SCNET_PHASE_TITLES.pre,
    desc: '基于铀供应链全链路数据，识别资源、运输、转化与政策环节的潜在扰动，提前形成风险评估与保障预案。',
    icon: '🔍',
    tag: '先知先觉 · 防患未然',
    bgClass: 'card-bg-pre'
  },
  {
    id: 2,
    phaseKey: 'during',
    name: SCNET_PHASE_TITLES.during,
    desc: '面向铀供应链运行中的冲击与波动，动态调整供给组合、运输路径和库存策略，支撑实时响应与协同调度。',
    icon: '⚡',
    tag: '实时响应 · 精准调度',
    bgClass: 'card-bg-during'
  },
  {
    id: 3,
    phaseKey: 'post',
    name: SCNET_PHASE_TITLES.post,
    desc: '围绕仿真结果与干预效果开展复盘，对供应安全、成本韧性和协同机制进行评估，为后续优化提供依据。',
    icon: '📈',
    tag: '深度复盘 · 韧性重构',
    bgClass: 'card-bg-post'
  }
])
