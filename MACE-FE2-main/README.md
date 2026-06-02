# 供应链仿真可视化系统

[![Vue](https://img.shields.io/badge/Vue-3.5+-green.svg)](https://vuejs.org)
[![Node](https://img.shields.io/badge/Node-20.17+-blue.svg)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/Vite-7.3-purple.svg)](https://vitejs.dev)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.9-blue.svg)](https://element-plus.org)

---

## 目录

- [1. 系统概述](#1-系统概述)
- [2. 快速开始](#2-快速开始)
- [3. 系统架构](#3-系统架构)
- [4. 核心功能](#4-核心功能)
- [5. 技术栈](#5-技术栈)
- [6. 项目结构](#6-项目结构)
- [7. 开发指南](#7-开发指南)

---

## 1. 系统概述

**供应链仿真可视化系统** 是基于Vue 3的Web端可视化平台，用于展示汽车供应链Multi-Agent仿真实验的运行过程和结果。

### 1.1 核心特性

- **实时数据可视化**：21个月仿真过程的动态展示
- **地理位置展示**：基于高德地图的68个港口企业聚类
- **网络演化分析**：4个图表展示企业数量、协作次数、类型分布等
- **时间轴控制**：支持播放、暂停、速度调节的时间轴回放
- **响应式设计**：适配不同屏幕尺寸的布局

### 1.2 数据规模

| 指标 | 数量 | 说明 |
|------|------|------|
| 港口数量 | 68 | 全球主要港口 |
| 企业总数 | 61 | 销售商17 + 制造商19 + 供应商25 |
| 协作关系 | 798 | 企业间协作边 |
| 时间步长 | 21个月 | 每个迭代运行21个月 |
| 实验迭代 | 多次 | 支持多次迭代对比 |

---

## 2. 快速开始

### 2.1 环境要求

- **Node.js**: 20.17.0+
- **npm**: 10.8.2+
- **后端服务**: 需要运行在 `http://localhost:9091`

### 2.2 安装依赖

```bash
cd frontend
npm install
```

### 2.3 启动开发服务器

```bash
npm run dev
```

服务将在 `http://localhost:8080` 启动。

### 2.4 启动后端服务

前端需要连接后端API服务，确保后端服务已启动：

```bash
cd /root/sgm-cmse
python3 tofront/app.py
```

后端服务运行在 `http://localhost:9091`。

### 2.5 访问系统

1. 打开浏览器访问 `http://localhost:8080`
2. 进入"供应链"场景
3. 选择"系统运行"菜单
4. 选择实验并查看可视化结果

---

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端应用层                              │
│                   Vue 3 + Vite                              │
├─────────────────────────────────────────────────────────────┤
│              状态管理层（Pinia）                             │
│  ┌──────────────┐                                           │
│  │ supplyChain  │  存储实验数据、时间轴状态                 │
│  │    Store     │  管理迭代和月份切换                       │
│  └──────────────┘                                           │
├─────────────────────────────────────────────────────────────┤
│                   组件层                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  港口面板  │  │  供应链地图 │  │ 网络演化   │           │
│  │PortEnterprise│ │SupplyChainMap││NetworkEvolution│       │
│  │   Panel    │  │            │  │   Chart    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │        SimulationTimeline（时间轴控制）           │     │
│  └──────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                   API层                                     │
│  ┌──────────────────────────────────────────────────┐     │
│  │  supplyChain.js  API封装（5个接口）               │     │
│  │  - getExperiments()                               │     │
│  │  - getTimeline(id)                                │     │
│  │  - getPorts()                                     │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│              后端服务（Flask - Port 9091）                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据流

```
用户操作（拖动滑块/点击播放）
  ↓
Store.setMonth(month)
  ↓
响应式状态更新
  ├── currentMonth 更新
  ├── currentEnvironment 重新计算
  ├── currentNetwork 重新计算
  └── currentPerformance 重新计算
  ↓
组件自动响应更新
  ├── SimulationTimeline: 更新指标卡片
  ├── NetworkEvolutionChart: 更新图表红点
  └── SupplyChainMap: 更新地图状态（如需要）
```

### 3.3 月度数据结构

后端返回的数据结构：

```javascript
{
  experiment_id: "20251230_124727",
  total_iterations: 2,
  iterations: [
    {
      iteration: 1,
      context_type: "recession",      // 环境类型
      duration: 21,                    // 月数
      trend_slope: -0.03,              // 订单趋势
      environment: [                   // 21个月的环境数据
        { month: 0, demand_level: 5000, ... },
        { month: 1, demand_level: 4850, ... },
        ...
      ],
      network: [                       // 21个月的网络数据
        { month: 0, total_enterprises: 150, ... },
        { month: 1, total_enterprises: 148, ... },
        ...
      ],
      performance: [                   // 21个月的性能数据
        { month: 0, order_completion_rate: 0.85, ... },
        { month: 1, order_completion_rate: 0.82, ... },
        ...
      ]
    },
    { iteration: 2, ... }
  ]
}
```

---

## 4. 核心功能

### 4.1 港口企业聚类面板

**组件**: `PortEnterprisePanel.vue`

**功能**:
- 展示68个港口的企业分布
- 支持滚动查看所有港口
- 点击港口查看详细信息
- 企业类型统计（制造商、销售商、供应商）
- 饼图展示企业类型分布

**交互**:
- 点击港口项 → 地图定位到该港口
- 滚动列表 → 查看更多港口

### 4.2 供应链地图

**组件**: `SupplyChainMap.vue`

**功能**:
- 基于高德地图的地理位置展示
- 68个港口标记（大小根据企业数量）
- 企业聚类圆圈（半径根据企业数量）
- 支持缩放和拖动
- 点击港口标记查看详情

**地图控制**:
- 切换港口标记显示
- 切换企业聚类显示
- 重置视图到初始位置

### 4.3 网络演化面板

**组件**: `NetworkEvolutionChart.vue`

**功能**:
- **企业总数演化**：折线图显示21个月的企业总数变化
- **协作次数演化**：折线图显示企业间协作活动
- **企业类型分布**：堆叠面积图显示制造商、销售商、供应商的数量变化
- **企业动态变化**：柱状图对比新生和死亡企业数量

**特点**:
- 红点标记当前选中的月份
- X轴显示"1月"、"2月"等月份标签
- 自动响应时间轴变化

### 4.4 时间轴控制台

**组件**: `SimulationTimeline.vue`

**功能**:
- **关键指标卡片**：环境类型、订单趋势、企业数量、完成率
- **迭代选择器**：在多次迭代间切换（如有）
- **月份显示**：显示当前月份（第X/21个月）
- **播放控制**：播放、暂停、重置
- **速度控制**：0.5x、1x、2x速度
- **月度滑块**：拖动滑块查看任意月份

**交互逻辑**:
- 拖动滑块 → 暂停播放并跳转到指定月份
- 点击播放 → 自动按月份推进（到最后一个月自动停止）
- 切换迭代 → 月份自动重置为第1个月

---

## 5. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue** | 3.5+ | 前端框架 |
| **Vite** | 7.3 | 构建工具 + 开发服务器 |
| **Element Plus** | 2.9.2 | UI组件库 |
| **Pinia** | 2.3+ | 状态管理 |
| **ECharts** | 5.4.3 | 图表可视化 |
| **Axios** | 1.8.4 | HTTP客户端 |
| **高德地图** | 2.0 | 地图服务 |
| **Node.js** | 20.17.0 | 运行环境 |
| **npm** | 10.8.2 | 包管理器 |

---

## 6. 项目结构

```
frontend/
├── public/                    # 静态资源
│   └── logo.png
├── src/
│   ├── main.js               # 应用入口
│   ├── App.vue               # 根组件
│   ├── router/
│   │   └── index.js          # 路由配置
│   ├── stores/               # Pinia状态管理
│   │   └── supplyChain.js    # 供应链数据状态
│   ├── api/                  # API接口封装
│   │   └── supplyChain.js    # 供应链API（5个接口）
│   ├── components/
│   │   ├── Header.vue        # 全局头部
│   │   └── SupplyChain/      # 供应链组件
│   │       ├── PortEnterprisePanel.vue      # 港口面板
│   │       ├── SupplyChainMap.vue           # 供应链地图
│   │       ├── NetworkEvolutionChart.vue    # 网络演化
│   │       └── SimulationTimeline.vue       # 时间轴
│   ├── views/
│   │   └── SCnet/
│   │       └── interface.vue # 系统运行主界面
│   ├── layout/
│   │   └── SCnetLayout.vue   # 供应链场景布局
│   ├── utils/
│   │   ├── request.js        # Axios封装
│   │   └── mapUtils.js       # 地图工具函数
│   └── assets/               # 样式和图片
├── package.json              # 项目依赖
├── vite.config.js            # Vite配置
└── README.md                 # 本文件
```

### 6.1 核心文件说明

#### Store: `stores/supplyChain.js`

状态管理核心，负责：
- 存储实验数据、时间轴数据
- 管理当前迭代和月份
- 提供响应式的当前数据 getters
- 处理播放、暂停、切换等操作

**关键状态**:
```javascript
state: {
  currentIteration: 0,      // 当前迭代索引（0开始）
  currentMonth: 0,          // 当前月份索引（0-20）
  timelineData: {           // 时序数据
    experiment_id,
    total_iterations,
    iterations: [...]
  }
}
```

**关键方法**:
```javascript
setIteration(iteration)     // 切换迭代
setMonth(month)             // 切换月份
playTimeline()              // 播放时间轴
pauseTimeline()             // 暂停播放
```

#### API: `api/supplyChain.js`

封装5个后端接口：
- `getExperiments()` - 获取实验列表
- `getExperimentDetail(id)` - 获取实验详情
- `getTimeline(id)` - 获取时序数据（核心）
- `getPorts()` - 获取港口聚合数据
- `healthCheck()` - 健康检查

#### 主界面: `views/SCnet/interface.vue`

协调所有组件：
- 顶部工具栏：实验选择、视图切换
- 三栏布局：港口面板、地图、网络演化
- 底部控制台：时间轴控制

---

## 7. 开发指南

### 7.1 添加新功能

1. **添加新API接口**
   - 在 `src/api/supplyChain.js` 添加新方法
   - 使用 `request` 工具发送请求

2. **添加新状态**
   - 在 `src/stores/supplyChain.js` 添加 state
   - 编写 getters 和 actions

3. **添加新组件**
   - 在 `src/components/SupplyChain/` 创建组件
   - 使用 `useSupplyChainStore()` 访问状态
   - 通过 `storeToRefs()` 解构响应式数据

### 7.2 调试技巧

1. **查看State**
   ```javascript
   import { useSupplyChainStore } from '@/stores/supplyChain'
   const store = useSupplyChainStore()
   console.log('当前月份:', store.currentMonth)
   console.log('当前环境:', store.currentEnvironment)
   ```

2. **Vue DevTools**
   - 访问 `http://localhost:8080/__devtools__/`
   - 查看组件树、Pinia状态、性能

3. **Network监控**
   - 浏览器开发者工具 → Network
   - 查看API请求和响应

### 7.3 常见问题

#### Q1: 地图不显示？
**A**: 检查高德地图API密钥是否配置正确（`SupplyChainMap.vue:157`）

#### Q2: 数据不更新？
**A**: 确保后端服务运行正常，检查浏览器控制台是否有API错误

#### Q3: 滑块不工作？
**A**: 检查 `SimulationTimeline.vue` 的 `onSliderChange` 方法是否调用了 `store.setMonth()`

#### Q4: 图表显示错误？
**A**: 检查后端返回的字段名是否与前端代码匹配

### 7.4 性能优化

1. **虚拟滚动**：港口列表较长时考虑使用虚拟滚动
2. **图表懒加载**：只在图表可见时初始化ECharts
3. **数据缓存**：已加载的实验数据可以缓存到Store
4. **防抖节流**：滑块事件可以添加防抖

### 7.5 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建产物在 `dist/` 目录，可以部署到任何静态文件服务器。

---

## 相关文档

- **后端服务文档**: [/root/sgm-cmse/tofront/README.md](../sgm-cmse/tofront/README.md)
- **月度时间步适配**: [/root/sgm-cmse/docs/SUPPLY_CHAIN_FRONTEND_MONTHLY_TIMELINE.md](../sgm-cmse/docs/SUPPLY_CHAIN_FRONTEND_MONTHLY_TIMELINE.md)
- **供应链场景指南**: [/root/sgm-cmse/docs/SUPPLY_CHAIN_GUIDE.md](../sgm-cmse/docs/SUPPLY_CHAIN_GUIDE.md)

---

**版本**: v1.0 | **更新日期**: 2026-01-14 | **维护者**: SGM-MSE Team
