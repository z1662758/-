import { createRouter, createWebHistory } from 'vue-router'
import SCnetLayout from "@/layout/SCnetLayout.vue";

// 定义懒加载组件
// 事中各页按 ?scenario= 分流（铀 / 汽车），与事前各 Wrapper 同一模式
const ScenarioModeling = () => import("../views/SCnet/ScenarioModelingWrapper.vue")
const ScenarioAnalysis = () => import("../views/SCnet/ScenarioAnalysisWrapper.vue")
const AgentSimulationStudioDemo = () => import("../views/SCnet/AgentSimulationStudioWrapper.vue")
const Interface = () => import("../views/SCnet/InterfaceWrapper.vue")
const EXreport = () => import("../views/SCnet/EXreport.vue")
const ExperimentManager = () => import("../views/SCnet/ExperimentManagerWrapper.vue")
const total = () => import("../views/SCnet/total.vue")
const situationAnalysis = () => import("../views/SCnet/PreScene/situationAnalysis.vue")
const routes = [
  {
    path: '/',
    redirect: '/chatHome'
  },
  {
    path: '/chatHome',
    name: 'ChatHome',
    component: () => import("../views/SCnet/ChatHome.vue"),
    meta: {
      title: "SCnet - 供应链智能对话"
    }
  },
  {
    path: '/chatKnowledge',
    name: 'ChatKnowledge',
    component: () => import("../views/SCnet/NewKnowledgeCenter.vue"),
    meta: {
      title: "SCnet - 知识库"
    }
  },
  {
    path: '/startPage',
    name: 'StartPage',
    component: () => import("../views/StartPage.vue"),
    meta: {
      title: "MACE",
      icon: "shopping-basket-2-fill"
    }
  },
  {
    path: '/home',
    redirect: '/home/SCnet/total'
  },
  {
    path: '/home/SCnet',
    component: SCnetLayout,
    meta: {
      title: "MACE - 供应链网络",
      icon: "shopping-basket-2-fill"
    },
    children: [
      {
        path: '',
        redirect: '/home/SCnet/total'
      },
      {
        path: 'scenarioModeling',
        name: 'SCnet_ScenarioModeling',
        component: ScenarioModeling
      },
      {
        path: 'scenarioAnalysis',
        name: 'SCnet_ScenarioAnalysis',
        component: ScenarioAnalysis
      },
      {
        path: 'agentSimulationStudio',
        name: 'SCnet_agentSimulationStudio',
        component: AgentSimulationStudioDemo
      },
      {
        path: 'agentSimulationStudio/workbench',
        name: 'SCnet_agentSimulationStudio_workbench',
        component: AgentSimulationStudioDemo
      },
      {
        path: 'experimentManager',
        name: 'SCnet_ExperimentManager',
        component: ExperimentManager
      },
      {
        path: 'agent-design-studio',
        name: 'AgentDesignStudio',
        component: AgentSimulationStudioDemo
      },
      {
        path: 'interface',
        name: 'SCnet_Interface',
        component: Interface
      },
      {
        path: 'EXreport',
        name: 'SCnet_EXreport',
        component: EXreport
      },
      {
        path: 'situationAnalysis',
        name: 'situationAnalysis',
        component: situationAnalysis
      },
      {
        path: 'situationJudge',
        name: 'situationJudge',
        component: () => import("../views/SCnet/situationJudgeWrapper.vue")
      },
      {
        path: 'total',
        name: 'total',
        component: total
      },

      {
        path: 'resultVerification',
        name: 'SCnet_ResultVerification',
        component: () => import("../views/SCnet/PreScene/ResultVerificationWrapper.vue")
      },
      {
        path: 'knowledgeBase',
        name: 'SCnet_KnowledgeBase',
        component: () => import("../views/SCnet/PreScene/KnowledgeBase.vue")
      },
      {
        path: 'knowledgeCreate',
        name: 'SCnet_KnowledgeCreate',
        component: () => import("../views/SCnet/PreScene/KnowledgeCreate.vue")
      },
      {
        path: 'knowledgeGraph',
        name: 'SCnet_KnowledgeGraph',
        component: () => import("../views/SCnet/PreScene/KnowledgeGraphWrapper.vue")
      },
      {
        path: 'openSourceIntelligence',
        name: 'SCnet_OpenSourceIntelligence',
        component: () => import("../views/SCnet/PreScene/OpenSourceIntelligence.vue")
      },
      {
        path: 'reportGeneration',
        name: 'SCnet_ReportGeneration',
        component: () => import("../views/SCnet/PreScene/ReportGeneration.vue")
      },
      {
        path: 'situationResearch-main',
        name: 'situationResearch-main',
        component: () => import("../views/SCnet/PreScene/situationResearchWrapper.vue")
      },
      {
        path: 'DisruptRisk',
        name: 'DisruptRisk',
        component: () => import("../views/SCnet/PreScene/DisruptRisk.vue")
      },
      {
        path: 'oilIntelligence',
        name: 'SCnet_OilIntelligence',
        component: () => import("../views/SCnet/PreScene/OilIntelligence.vue")
      },
      {
        path: 'oilSituationAnalysis',
        name: 'SCnet_OilSituationAnalysis',
        component: () => import("../views/SCnet/PreScene/OilSituationAnalysis.vue")
      },
      {
        path: 'oilReportGeneration',
        name: 'SCnet_OilReportGeneration',
        component: () => import("../views/SCnet/PreScene/OilReportGeneration.vue")
      },

      // ========== 事中 · 决策分析 ==========
      {
        path: 'expAnalysisOverview',
        name: 'SCnet_ExpAnalysisOverview',
        component: () => import("../views/SCnet/ExpAnalysis_OverviewWrapper.vue")
      },
      {
        path: 'expAnalysisDecisionTree',
        name: 'SCnet_ExpAnalysisDecisionTree',
        component: () => import("../views/SCnet/ExpAnalysis_DecisionTreeWrapper.vue")
      },
      {
        path: 'expAnalysisScenario',
        name: 'SCnet_ExpAnalysisScenario',
        component: () => import("../views/SCnet/ExpAnalysis_ScenarioWrapper.vue")
      },
      {
        path: 'expAnalysisGameTheory',
        name: 'SCnet_ExpAnalysisGameTheory',
        component: () => import("../views/SCnet/ExpAnalysis_GameTheoryWrapper.vue")
      },

      // ========== 事后 · 实验分析 placeholder ==========
      {
        path: 'expAnalysisObserve',
        name: 'SCnet_ExpAnalysisObserve',
        component: () => import("../views/SCnet/ExpAnalysis_Observe.vue")
      },
      {
        path: 'expAnalysisIntervention',
        name: 'SCnet_ExpAnalysisIntervention',
        component: () => import("../views/SCnet/ExpAnalysis_Intervention.vue")
      },
      {
        path: 'expAnalysisMechanism',
        name: 'SCnet_ExpAnalysisMechanism',
        component: () => import("../views/SCnet/ExpAnalysis_Mechanism.vue")
      },
      {
        path: 'counterfactualExperiment',
        name: 'SCnet_CounterfactualExperiment',
        component: () => import("../views/SCnet/CounterfactualExperiment.vue")
      }

    ]
  },
  {
    // 兜底：匹配不到的路径不再白屏。
    // 多斜杠（如 //interface、//home//SCnet//interface）vue-router 匹配不到，会报
    // "A resolved location cannot start with multiple slashes"，这里先规范化再重新匹配；
    // 规范化后仍然匹配不到的，统一回首页。
    path: '/:pathMatch(.*)*',
    redirect: (to) => {
      if (to.path.includes('//')) {
        return { path: to.path.replace(/\/{2,}/g, '/'), query: to.query, hash: to.hash }
      }
      return '/chatHome'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 页面加载完成后，预加载所有路由组件
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // 延迟 1 秒后开始预加载，避免影响首屏渲染
    setTimeout(() => {
      ScenarioModeling()
      ScenarioAnalysis()
      ExperimentManager()
      AgentSimulationStudioDemo()
      Interface()
      EXreport()
      situationAnalysis()
    }, 1000)
  })
}

export default router
