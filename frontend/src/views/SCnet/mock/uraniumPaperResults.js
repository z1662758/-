const PAPER_RESULTS_META = Object.freeze({
  updatedAt: '2026-07-22',
  trainingWindow: '1997-2018',
  validationWindow: '2019-2024',
  scoreMetric: 'validation_score',
  scoreRange: '0-100',
  baselineScenario: 'normal',
  note: '`normal` 表示无额外合成冲击的基础验证情景，不表示没有历史事件。'
})

const MODEL_COMPARISON_ROWS = Object.freeze([
  {
    tier: '正式',
    ranking: '1',
    alias: 'deepseek',
    model: 'deepseek-v4-flash',
    iterations: '30',
    validation: '88.599',
    objective: '0.114',
    totalTime: '211.141s',
    llmTime: '197.780s',
    status: '30 轮正式有效'
  },
  {
    tier: '正式',
    ranking: '2',
    alias: 'kimi',
    model: 'kimi-k2.6',
    iterations: '30',
    validation: '88.112',
    objective: '0.119',
    totalTime: '1240.746s',
    llmTime: '1230.865s',
    status: '仅完整完成 normal 30 轮'
  },
  {
    tier: '正式',
    ranking: '3',
    alias: 'qwen',
    model: 'qwen-turbo',
    iterations: '30',
    validation: '88.039',
    objective: '0.120',
    totalTime: '242.849s',
    llmTime: '233.183s',
    status: '30 轮正式有效'
  },
  {
    tier: 'Probe',
    ranking: '-',
    alias: 'claude',
    model: 'claude-sonnet-5',
    iterations: '1',
    validation: '87.252',
    objective: '0.127',
    totalTime: '16.647s',
    llmTime: '16.162s',
    status: '1 轮 probe'
  },
  {
    tier: 'Probe',
    ranking: '-',
    alias: 'glm',
    model: 'glm-5.2',
    iterations: '1',
    validation: '87.252',
    objective: '0.127',
    totalTime: '18.939s',
    llmTime: '18.416s',
    status: '1 轮 probe'
  },
  {
    tier: 'Probe',
    ranking: '-',
    alias: 'gpt',
    model: 'gpt-5.5',
    iterations: '1',
    validation: '87.252',
    objective: '0.127',
    totalTime: '120.786s',
    llmTime: '120.275s',
    status: '1 轮 probe'
  }
])

const MODEL_BUSINESS_ROWS = Object.freeze([
  {
    model: 'deepseek',
    reliability: '1.000',
    cost: '0.865',
    risk: '0.795',
    resilience: '0.765',
    inventory: '1.000',
    calibration: '0.182',
    suppliers: '5.833',
    hhi: '0.205'
  },
  {
    model: 'kimi',
    reliability: '1.000',
    cost: '0.878',
    risk: '0.753',
    resilience: '0.750',
    inventory: '1.000',
    calibration: '0.151',
    suppliers: '4.000',
    hhi: '0.247'
  },
  {
    model: 'qwen',
    reliability: '1.000',
    cost: '0.887',
    risk: '0.743',
    resilience: '0.743',
    inventory: '1.000',
    calibration: '0.144',
    suppliers: '3.333',
    hhi: '0.257'
  }
])

const EXTERNAL_COMPARISON_ROWS = Object.freeze([
  {
    ranking: '1',
    method: 'SGM',
    averageValidation: '86.349',
    deltaVsSgm: '0.000',
    bestScenario: 'niger_coup',
    bestScore: '88.282',
    weakestScenario: 'demand_surge',
    weakestScore: '82.130'
  },
  {
    ranking: '2',
    method: 'CoMM',
    averageValidation: '84.107',
    deltaVsSgm: '-2.242',
    bestScenario: 'normal',
    bestScore: '86.832',
    weakestScenario: 'demand_surge',
    weakestScore: '79.112'
  },
  {
    ranking: '3',
    method: 'AutoGen',
    averageValidation: '83.636',
    deltaVsSgm: '-2.713',
    bestScenario: 'niger_coup',
    bestScore: '86.719',
    weakestScenario: 'demand_surge',
    weakestScore: '79.247'
  },
  {
    ranking: '4',
    method: 'MC-ML',
    averageValidation: '81.962',
    deltaVsSgm: '-4.387',
    bestScenario: 'niger_coup',
    bestScore: '85.181',
    weakestScenario: 'demand_surge',
    weakestScore: '77.030'
  }
])

const EXTERNAL_SCENARIO_MATRIX_ROWS = Object.freeze([
  {
    method: 'SGM',
    normal: '88.039',
    kazakhSanction: '86.678',
    nigerCoup: '88.282',
    priceSpike: '87.741',
    demandSurge: '82.130',
    war: '84.810',
    combinedShock: '86.762',
    average: '86.349'
  },
  {
    method: 'CoMM',
    normal: '86.832',
    kazakhSanction: '85.228',
    nigerCoup: '86.343',
    priceSpike: '85.015',
    demandSurge: '79.112',
    war: '82.919',
    combinedShock: '83.297',
    average: '84.107'
  },
  {
    method: 'AutoGen',
    normal: '86.548',
    kazakhSanction: '84.003',
    nigerCoup: '86.719',
    priceSpike: '85.177',
    demandSurge: '79.247',
    war: '81.649',
    combinedShock: '82.109',
    average: '83.636'
  },
  {
    method: 'MC-ML',
    normal: '84.915',
    kazakhSanction: '82.822',
    nigerCoup: '85.181',
    priceSpike: '84.997',
    demandSurge: '77.030',
    war: '78.369',
    combinedShock: '80.420',
    average: '81.962'
  }
])

const INTERNAL_STRATEGY_ROWS = Object.freeze([
  {
    ranking: '1',
    strategy: 'diversified_top5',
    averageValidation: '85.702',
    deltaVsBaseline: '+2.230',
    bestScenario: 'price_spike',
    bestScore: '87.521',
    weakestScenario: 'russo_ukrainian_war',
    weakestScore: '82.348'
  },
  {
    ranking: '2',
    strategy: 'adaptive_price',
    averageValidation: '84.041',
    deltaVsBaseline: '+0.569',
    bestScenario: 'niger_coup',
    bestScore: '86.631',
    weakestScenario: 'russo_ukrainian_war',
    weakestScore: '80.631'
  },
  {
    ranking: '3',
    strategy: 'baseline_top3',
    averageValidation: '83.472',
    deltaVsBaseline: '0.000',
    bestScenario: 'niger_coup',
    bestScore: '86.366',
    weakestScenario: 'russo_ukrainian_war',
    weakestScore: '80.533'
  },
  {
    ranking: '4',
    strategy: 'single_low_cost',
    averageValidation: '73.994',
    deltaVsBaseline: '-9.478',
    bestScenario: 'niger_coup',
    bestScore: '81.133',
    weakestScenario: 'russo_ukrainian_war',
    weakestScore: '61.552'
  }
])

const INTERNAL_DIFFICULTY_ROWS = Object.freeze([
  {
    scenario: 'russo_ukrainian_war',
    averageScore: '76.266',
    scoreGap: '20.796',
    interpretation: '最困难情景，单一低成本策略明显失稳。'
  },
  {
    scenario: 'combined_shock',
    averageScore: '78.537',
    scoreGap: '19.068',
    interpretation: '组合冲击显著放大策略差异。'
  },
  {
    scenario: 'kazakh_sanction',
    averageScore: '81.233',
    scoreGap: '15.442',
    interpretation: '制裁对集中采购策略打击最明显。'
  },
  {
    scenario: 'price_spike',
    averageScore: '84.209',
    scoreGap: '7.344',
    interpretation: '价格冲击下，多元化仍优于价格自适应。'
  }
])

export function buildUraniumPaperResultsModel() {
  return {
    meta: PAPER_RESULTS_META,
    executiveSummary: [
      '模型对比中，deepseek-v4-flash 在基础 normal 情景 30 轮正式结果里验证分最高，为 88.599。',
      '外部方法对比中，SGM 在 7 个验证情景全部第一，平均验证分 86.349，较 CoMM 高 2.242 分。',
      '内部策略对比中，diversified_top5 在 7 个情景全部第一，平均验证分 85.702，说明来源多元化比单纯低成本更稳健。'
    ],
    summaryCards: [
      {
        label: '模型配置最优',
        value: 'deepseek-v4-flash',
        detail: 'normal 30 轮验证分 88.599，快于 qwen 与 kimi。'
      },
      {
        label: '外部方法最优',
        value: 'SGM',
        detail: '7 情景平均 86.349，全部情景第一。'
      },
      {
        label: '内部策略最优',
        value: 'diversified_top5',
        detail: '7 情景平均 85.702，较 baseline_top3 提升 2.230 分。'
      },
      {
        label: '统一结论',
        value: '多元化优先',
        detail: '战争升级、组合冲击、制裁场景下，来源覆盖与集中度控制比最低成本更关键。'
      }
    ],
    sections: [
      {
        id: 'model-comparison',
        label: '模型对比',
        title: '基础设置下的不同 LLM 效果',
        summary: '固定 SGM 方法与基础 normal 设置，对比不同大模型在同一验证口径下的输出质量、业务指标和运行成本。',
        highlights: [
          {
            label: '正式第一',
            value: 'deepseek-v4-flash',
            detail: '验证分 88.599，objective 0.114。'
          },
          {
            label: '正式排序',
            value: 'deepseek > kimi > qwen',
            detail: '仅这三组具备 30 轮正式可比结果。'
          },
          {
            label: '速度对比',
            value: '211.141s / 242.849s / 1240.746s',
            detail: '分别对应 deepseek、qwen、kimi 的总耗时。'
          }
        ],
        primaryTable: {
          title: '综合结果',
          columns: [
            { key: 'tier', label: '层级', width: 78 },
            { key: 'ranking', label: '排名', width: 72 },
            { key: 'alias', label: '别名', minWidth: 96 },
            { key: 'model', label: '实际模型', minWidth: 160 },
            { key: 'iterations', label: '迭代', width: 72 },
            { key: 'validation', label: '验证分', width: 92 },
            { key: 'objective', label: '目标值', width: 92 },
            { key: 'totalTime', label: '总耗时', width: 100 },
            { key: 'status', label: '状态', minWidth: 168 }
          ],
          rows: MODEL_COMPARISON_ROWS
        },
        secondaryTable: {
          title: '业务指标',
          columns: [
            { key: 'model', label: '模型', minWidth: 92 },
            { key: 'reliability', label: '供应可靠', width: 92 },
            { key: 'cost', label: '成本效率', width: 92 },
            { key: 'risk', label: '风险分散', width: 92 },
            { key: 'resilience', label: '网络韧性', width: 92 },
            { key: 'inventory', label: '库存充足', width: 92 },
            { key: 'hhi', label: '供应 HHI', width: 92 }
          ],
          rows: MODEL_BUSINESS_ROWS
        },
        conclusions: [
          'deepseek 的优势主要来自更高的风险分散度、网络韧性和供应商覆盖数。',
          'kimi 基础情景分数略高于 qwen，但耗时显著更高，且当前只完成部分多情景实验。',
          'claude、glm、gpt 目前只有 1 轮 probe，可用于通道验证，不应与 30 轮正式结果直接同排。'
        ]
      },
      {
        id: 'external-comparison',
        label: '外部对比',
        title: 'SGM vs SOTA / Baselines',
        summary: '固定训练期 1997-2018、验证期 2019-2024、qwen 配置、每种方法 30 轮且重复 5 次，对比 SGM、CoMM、AutoGen、MC-ML。',
        highlights: [
          {
            label: '平均验证分第一',
            value: 'SGM 86.349',
            detail: '较第二名 CoMM 高 2.242 分。'
          },
          {
            label: '情景覆盖',
            value: '7 / 7 第一',
            detail: 'normal 到 combined_shock 全部保持领先。'
          },
          {
            label: '协作冗余',
            value: 'CoMM 781.750s',
            detail: '平均协作耗时极高，AutoGen 还存在明显无效轮次。'
          }
        ],
        primaryTable: {
          title: '综合排名',
          columns: [
            { key: 'ranking', label: '排名', width: 72 },
            { key: 'method', label: '方法', minWidth: 96 },
            { key: 'averageValidation', label: '平均验证分', width: 108 },
            { key: 'deltaVsSgm', label: '相对 SGM', width: 96 },
            { key: 'bestScenario', label: '最优情景', minWidth: 126 },
            { key: 'bestScore', label: '最优分', width: 90 },
            { key: 'weakestScenario', label: '最弱情景', minWidth: 136 },
            { key: 'weakestScore', label: '最弱分', width: 90 }
          ],
          rows: EXTERNAL_COMPARISON_ROWS
        },
        secondaryTable: {
          title: '分情景结果矩阵',
          columns: [
            { key: 'method', label: '方法', minWidth: 96, fixed: 'left' },
            { key: 'normal', label: 'normal', width: 94 },
            { key: 'kazakhSanction', label: 'kazakh_sanction', width: 128 },
            { key: 'nigerCoup', label: 'niger_coup', width: 108 },
            { key: 'priceSpike', label: 'price_spike', width: 106 },
            { key: 'demandSurge', label: 'demand_surge', width: 120 },
            { key: 'war', label: 'war', width: 90 },
            { key: 'combinedShock', label: 'combined_shock', width: 130 },
            { key: 'average', label: '均值', width: 92 }
          ],
          rows: EXTERNAL_SCENARIO_MATRIX_ROWS
        },
        conclusions: [
          'SGM 的优势主要来自风险分散、网络韧性和库存充足度，而不是单纯压低采购成本。',
          'CoMM 和 AutoGen 的平均分接近，但存在明显协作冗余和对话重复问题。',
          'MC-ML 运行最快，但在复杂冲击场景中的综合表现最弱。'
        ]
      },
      {
        id: 'internal-comparison',
        label: '内部策略',
        title: '不同采购条件下的稳健性',
        summary: '固定 E0-E3 策略，不做训练期二次优化，也不启用 LLM 提案，只看不同采购条件在 7 个验证情景中的稳健性差异。',
        highlights: [
          {
            label: '内部策略第一',
            value: 'diversified_top5',
            detail: '平均验证分 85.702，7 个情景全部第一。'
          },
          {
            label: '最弱策略',
            value: 'single_low_cost',
            detail: '平均分 73.994，较 baseline_top3 低 9.478 分。'
          },
          {
            label: '最强区分场景',
            value: 'war / combined_shock',
            detail: '策略间分差分别达到 20.796 和 19.068。'
          }
        ],
        primaryTable: {
          title: '综合排名',
          columns: [
            { key: 'ranking', label: '排名', width: 72 },
            { key: 'strategy', label: '策略', minWidth: 132 },
            { key: 'averageValidation', label: '平均验证分', width: 108 },
            { key: 'deltaVsBaseline', label: '相对 E0', width: 96 },
            { key: 'bestScenario', label: '最优情景', minWidth: 126 },
            { key: 'bestScore', label: '最优分', width: 90 },
            { key: 'weakestScenario', label: '最弱情景', minWidth: 150 },
            { key: 'weakestScore', label: '最弱分', width: 90 }
          ],
          rows: INTERNAL_STRATEGY_ROWS
        },
        secondaryTable: {
          title: '情景难度与策略敏感性',
          columns: [
            { key: 'scenario', label: '情景', minWidth: 160 },
            { key: 'averageScore', label: '策略平均分', width: 110 },
            { key: 'scoreGap', label: '策略间分差', width: 110 },
            { key: 'interpretation', label: '说明', minWidth: 220 }
          ],
          rows: INTERNAL_DIFFICULTY_ROWS
        },
        conclusions: [
          '多元化来源比单纯低成本或轻量价格自适应更稳健。',
          '战争升级、组合冲击和制裁情景最能区分策略优劣，适合作为系统里的压力测试主证据。',
          '供应链韧性的关键不是最低成本，而是来源覆盖与集中度控制。'
        ]
      }
    ]
  }
}
