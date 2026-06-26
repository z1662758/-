<template>
  <div class="report-page">
    <div class="situation-analysis-container">
      <div class="chat-wrapper">
        <div class="chat-header">
          <div class="header-title">
            <span><el-icon><Monitor /></el-icon> 铀矿情报分析</span>
          </div>
          <div class="header-subtitle">铀矿山动态 & 地缘风险 Agent</div>

          <!-- 新增：导入本地数据库按钮 -->
          <div style="display:flex; gap:8px; align-items:center;">
            <el-button class="kb-btn" plain @click="openFileDialog" title="从本地导入数据库（选择包含 JSON 的文件或目录）">
              导入本地数据库
            </el-button>
          </div>
        </div>

        <div class="chat-body" ref="chatWindow">
          <div v-if="messages.length === 0" class="welcome-screen">
            <div class="welcome-icon">☢️⚛️</div>
            <h2>铀矿供应链分析 Agent 已就绪</h2>
            <p>你好，我是专注于全球铀矿市场的智能分析助手。我可以评估 U3O8 价格波动、矿山产量变化及地缘政治对铀供应的影响。</p>
            <p style="font-size:13px; margin-top:8px; color:#6c86a3;">示例：分析尼日尔矿权撤销影响 | 评估Kazatomprom硫酸短缺 | 追踪McArthur River重启爬坡 | 评估Sprott基金持仓变化</p>
          </div>

          <div v-for="(msg, idx) in messages" :key="idx" :class="['message-box', msg.role]">
            <div class="avatar">
              {{ msg.role === 'user' ? '分析师' : 'Agent' }}
            </div>
            <div class="message-content">
              <div v-if="msg.role === 'user'" class="user-text">
                {{ msg.content }}
              </div>
              <div v-else class="agent-timeline">
                <div v-for="(event, eIdx) in msg.events" :key="eIdx" :class="['event-block', event.type]">

                  <div v-if="event.type === 'report'" class="report-action">
                    <el-button type="success" :icon="Document" @click="viewReport(event.content)">
                      点击查看铀矿分析报告
                    </el-button>
                  </div>

                  <div v-else class="interactive-block">
                    <div class="block-header" @click="toggleCollapse(event)" :class="{'is-clickable': event.type !== 'stream' && event.type !== 'info'}">
                      <span class="block-icon">
                        <i v-if="event.type === 'stream'" class="el-icon-cpu"></i>
                        <i v-else-if="event.type === 'tool_start'" class="el-icon-setting"></i>
                        <i v-else-if="event.type === 'tool_end'" class="el-icon-data-analysis"></i>
                        <i v-else-if="event.type === 'error'" class="el-icon-warning"></i>
                        <i v-else class="el-icon-info"></i>
                      </span>
                      <span class="block-title">{{ getEventTypeName(event) }}</span>

                      <i v-if="(event.type === 'stream' || event.type === 'info' || event.type === 'tool_exec') && msg.status === 'running' && eIdx === msg.events.length - 1" class="el-icon-loading tracking-icon"></i>

                      <span class="collapse-icon" v-if="event.type !== 'stream' && event.type !== 'info'">
                        <i :class="event.collapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
                      </span>
                    </div>

                    <el-collapse-transition>
                      <div class="block-body" v-show="!event.collapsed">
                        <template v-if="event.type === 'stream'">
                          <div v-for="(part, pIdx) in parseStreamContent(event.content)" :key="pIdx">
                            <div v-if="part.type === 'think'" class="think-block">
                              <div class="think-header" @click="event.thinkCollapsed = !event.thinkCollapsed">
                                <i class="el-icon-magic-stick"></i> 深度研判 (Thought)
                                <i :class="event.thinkCollapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
                              </div>
                              <el-collapse-transition>
                                <pre v-show="!event.thinkCollapsed" class="think-body">{{ part.content }}</pre>
                              </el-collapse-transition>
                            </div>
                            <pre v-else class="body-text">{{ part.content }}</pre>
                          </div>
                        </template>
                        <template v-else-if="event.content && (event.content.includes('量化评估') || event.content.includes('生成报告'))">
                          <pre class="body-text">{{ event.content }}</pre>
                          <div class="progress-wrapper">
                            <el-progress
                              class="soft-progress"
                              :percentage="event.fakeProgress || 0"
                              :stroke-width="14"
                              :show-text="false"
                              color="#b91c1c"
                            />
                          </div>
                        </template>
                        <pre v-else class="body-text">{{ event.content }}</pre>
                      </div>
                    </el-collapse-transition>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-footer">
          <div class="input-container">
            <el-input
              v-model="userInput"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="请输入你想分析的铀矿议题（例：尼日尔政变对欧盟核燃料采购的影响）"
              @keyup.enter.native="submitAnalysis"
              :disabled="loading"
              class="action-input"
            ></el-input>
            <el-popover
              placement="top-end"
              :width="520"
              trigger="click"
              popper-class="source-config-popper"
            >
              <template #reference>
                <el-button class="source-popover-btn" plain>
                  数据源
                  <span class="source-count">{{ selectedWebSources.length + selectedOsintSources.length }}</span>
                </el-button>
              </template>
              <div class="source-popover-body">
                <div class="source-popover-title">情报源配置</div>
                <div class="source-section">
                  <div class="group-title">行业数据库</div>
                  <el-checkbox-group v-model="selectedWebSources" class="source-grid">
                    <el-checkbox v-for="item in webSourceOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
                  </el-checkbox-group>
                </div>
                <div class="source-section">
                  <div class="group-title">实时监测</div>
                  <el-checkbox-group v-model="selectedOsintSources" class="source-grid">
                    <el-checkbox v-for="item in osintSourceOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
                  </el-checkbox-group>
                </div>
              </div>
            </el-popover>
            <el-button type="primary" class="send-btn" :loading="loading" @click="submitAnalysis">
              <span>{{ loading ? '研判中...' : '开始分析' }}</span>
              <el-icon class="el-icon--right"><Position /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <el-dialog title="铀矿供应链分析报告" v-model="reportDialogVisible" width="88%" top="4vh" custom-class="report-dialog">
        <div class="report-markdown" style="padding: 0; min-height: 500px; display: flex; flex-direction: column;">
          <div class="markdown-body" v-html="renderedReport" style="padding: 24px; max-height: 78vh; overflow-y: auto;"></div>
        </div>
        <template v-slot:footer>
          <span class="dialog-footer">
            <el-button type="primary" @click="reportDialogVisible = false">关闭报告</el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 隐藏文件输入，支持选择文件夹（webkitdirectory）或多文件 -->
      <input
        ref="fileInput"
        type="file"
        style="display:none"
        webkitdirectory
        directory
        multiple
        accept=".json,application/json"
        @change="handleImportFiles"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { marked } from 'marked';
import { Monitor, Position, Document } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// ================= 内嵌铀矿供应链数据（模拟后端） =================
const oilSupplyChainDB = {
  "霍尔木兹": {
    riskIndex: 92,
    level: "极高危",
    summary: "霍尔木兹海峡是全球最重要的石油咽喉，当前地缘紧张局势导致油轮通行检查加强，保险费率飙升。若发生实质性封锁，U3O8现货价可能突破$120/lb。",
    events: ["尼日尔军政府审查外资矿权", "Kazatomprom 发布硫酸短缺预警", "哈萨克斯坦 ISL 矿山硫酸供应告急", "Cameco McArthur River 爬坡延迟"],
    recommendations: ["立即评估全球可用铀闲置产能和库存", "评估中哈/非-欧铀运输替代路线", "锁定铀矿长协供应合同"]
  },
  "SPR": {
    riskIndex: 45,
    level: "中低危",
    summary: "全球铀库存消费比降至历史低位，矿山产量仅覆盖需求的84%。此举短期内能缓解市场供应焦虑，但长期来看可能导致全球库存处于历史低位，削弱应对突发中断的能力。",
    events: ["能源部宣布释放3000万桶原油", "现货-长协价差出现倒挂", "纳米比亚/加拿大出口港装船量激增", "OPEC+维持现有减产配额"],
    recommendations: ["逢低锁定长协充实铀库存", "关注尼日尔/哈萨克斯坦政局变化", "跟踪U3O8现货-长协价差变化"]
  },
  "俄罗斯": {
    riskIndex: 78,
    level: "高危",
    summary: "欧盟对俄油限价政策持续发酵，俄罗斯铀矿折扣幅度扩大。东西伯利亚管道(ESPO)成为亚洲买家争夺的焦点，物流重构导致运输成本显著上升。",
    events: ["G7达成价格上限协议", "波罗的海油运密度增加60%", "印度大量采购打折俄油", "俄罗斯威胁削减产量作为反制"],
    recommendations: ["建立多源采购体系避免单一依赖", "利用期货工具对冲价格波动风险", "评估非制裁国家的转口贸易合规性"]
  },
  "新能源": {
    riskIndex: 60,
    level: "中危",
    summary: "能源转型加速背景下，传统炼厂面临环保压力与利润挤压的双重挑战。部分老旧炼厂永久关闭导致成品油区域性短缺，而生物燃料产能扩张尚不足以填补缺口。",
    events: ["欧盟碳边境调节机制(CBAM)生效", "加州炼厂因环保法规升级", "生物质柴油项目投产延迟", "电动车渗透率超预期增长"],
    recommendations: ["投资炼化一体化升级项目", "布局绿色氢能等替代能源", "优化成品油区域调配网络"]
  },
  "default": {
    riskIndex: 55,
    level: "中危",
    summary: "全球石油市场处于紧平衡状态。建议密切关注OPEC+月度产量会议决议及主要经济体制造业PMI数据，防范需求侧衰退带来的价格剧烈波动。",
    events: ["OPEC+延长自愿减产协议", "全球铀浮仓/在途库存数量下降", "核电装机需求恢复至疫情前水平", "铀矿勘探支出趋于保守"],
    recommendations: ["实施动态库存管理策略", "建立地缘政治风险预警仪表盘", "定期开展供应链压力测试"]
  }
};

// 新增：结构化样例数据集（时间序列与摘要指标）
const oilDatasets = {
  "霍尔木兹": {
    priceSeries: [
      { date: '2026-02-01', brent: 92.3, wti: 86.7 },
      { date: '2026-03-01', brent: 95.1, wti: 88.9 },
      { date: '2026-04-01', brent: 101.7, wti: 95.2 }
    ],
    refineryUtil: [
      { date: '2026-03-01', utilization: 84.2 },
      { date: '2026-04-01', utilization: 82.5 }
    ],
    inventories: [
      { date: '2026-03-01', globalStocksMb: 1500 },
      { date: '2026-04-01', globalStocksMb: 1440 }
    ],
    aisIncidentsLast30d: 18,
    exportVolumesKbpd: { gulf: 8500, asia: 4200 }
  },
  "SPR": {
    priceSeries: [
      { date: '2026-02-01', brent: 86.0, wti: 79.5 },
      { date: '2026-03-01', brent: 84.2, wti: 78.1 },
      { date: '2026-04-01', brent: 82.0, wti: 75.9 }
    ],
    refineryUtil: [
      { date: '2026-03-01', utilization: 80.1 },
      { date: '2026-04-01', utilization: 78.7 }
    ],
    inventories: [
      { date: '2026-03-01', globalStocksMb: 1605 },
      { date: '2026-04-01', globalStocksMb: 1580 }
    ],
    aisIncidentsLast30d: 6,
    exportVolumesKbpd: { gulf: 7200, asia: 3300 }
  },
  "俄罗斯": {
    priceSeries: [
      { date: '2026-02-01', brent: 88.5, wti: 82.0 },
      { date: '2026-03-01', brent: 90.2, wti: 84.1 },
      { date: '2026-04-01', brent: 94.8, wti: 88.6 }
    ],
    refineryUtil: [
      { date: '2026-03-01', utilization: 86.0 },
      { date: '2026-04-01', utilization: 85.4 }
    ],
    inventories: [
      { date: '2026-03-01', globalStocksMb: 1480 },
      { date: '2026-04-01', globalStocksMb: 1455 }
    ],
    aisIncidentsLast30d: 9,
    exportVolumesKbpd: { arctic: 2500, blackSea: 3100 }
  },
  "新能源": {
    priceSeries: [
      { date: '2026-02-01', brent: 78.6, wti: 72.3 },
      { date: '2026-03-01', brent: 79.1, wti: 72.9 },
      { date: '2026-04-01', brent: 80.4, wti: 74.0 }
    ],
    refineryUtil: [
      { date: '2026-03-01', utilization: 76.5 },
      { date: '2026-04-01', utilization: 75.2 }
    ],
    inventories: [
      { date: '2026-03-01', globalStocksMb: 1620 },
      { date: '2026-04-01', globalStocksMb: 1618 }
    ],
    aisIncidentsLast30d: 3,
    exportVolumesKbpd: { biofuels: 450 }
  },
  "default": {
    priceSeries: [
      { date: '2026-02-01', brent: 85.0, wti: 79.0 },
      { date: '2026-03-01', brent: 86.4, wti: 80.2 },
      { date: '2026-04-01', brent: 88.9, wti: 82.7 }
    ],
    refineryUtil: [
      { date: '2026-03-01', utilization: 81.3 },
      { date: '2026-04-01', utilization: 80.6 }
    ],
    inventories: [
      { date: '2026-03-01', globalStocksMb: 1550 },
      { date: '2026-04-01', globalStocksMb: 1528 }
    ],
    aisIncidentsLast30d: 10,
    exportVolumesKbpd: { global: 14500 }
  }
};

// 关键词匹配逻辑
const matchOilTopic = (query) => {
  const lower = query.toLowerCase();
  if (lower.includes('尼日尔') || lower.includes('非洲') || lower.includes('矿权') || lower.includes('政变')) return '尼日尔铀矿';
  if (lower.includes('哈萨克') || lower.includes('硫酸') || lower.includes('kazatomprom') || lower.includes('中亚')) return '哈萨克斯坦供给';
  if (lower.includes('俄罗斯') || lower.includes('乌克兰') || lower.includes('制裁') || lower.includes('乌拉尔')) return '俄罗斯';
  if (lower.includes('核电') || lower.includes('装机') || lower.includes('反应堆') || lower.includes('机组')) return '核电复兴';
  return 'default';
};

// 修改：generateReport 接受 dataset 并在报告中加入“数据集摘要”
const generateReport = (query, sourceConfig, topicData, topicKey, dataset) => {
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const sourcesList = [...sourceConfig.web, ...sourceConfig.osint].slice(0, 5).join('、');

  // 从 dataset 提取简单度量（以最新点为准）
  const latestPrice = (dataset && dataset.priceSeries && dataset.priceSeries.length) ? dataset.priceSeries[dataset.priceSeries.length - 1] : null;
  const prevPrice = (dataset && dataset.priceSeries && dataset.priceSeries.length >= 2) ? dataset.priceSeries[dataset.priceSeries.length - 2] : null;
  const priceChange3m = latestPrice && prevPrice ? Math.round(((latestPrice.brent - prevPrice.brent) / prevPrice.brent) * 100 * 10) / 10 : null;
  const latestRefinery = (dataset && dataset.refineryUtil && dataset.refineryUtil.length) ? dataset.refineryUtil[dataset.refineryUtil.length - 1].utilization : null;
  const latestStocks = (dataset && dataset.inventories && dataset.inventories.length) ? dataset.inventories[dataset.inventories.length - 1].globalStocksMb : null;

  return `# 🛢️ 铀矿供应链态势分析报告

**分析主题**：${query}
**评估日期**：${date}
**风险指数**：**${topicData.riskIndex}/100**（等级：${topicData.level}）
**信息源配置**：${sourcesList}

---

## 1. 总体态势研判

${topicData.summary}

---

## 2. 关键扰动事件监测

${topicData.events.map((e, i) => `- **事件${i+1}**：${e}`).join('\n')}

---

## 3. 韧性提升与行动建议

${topicData.recommendations.map((r, i) => `- **建议${i+1}**：${r}`).join('\n')}

---

## 4. 量化评估指标

| 指标 | 当前值 | 行业基准 | 状态 |
|------|--------|----------|------|
| 供应中断概率 | ${Math.min(95, topicData.riskIndex + 5)}% | 30% | ${topicData.riskIndex > 70 ? '⚠️ 极高' : (topicData.riskIndex > 50 ? '⚡ 关注' : '✅ 正常')} |
| 价格波动预期 | ${topicData.riskIndex > 70 ? '±15%' : '±5%'} | ±8% | - |
| 物流冗余度 | ${topicData.riskIndex > 70 ? '不足2周' : '4周以上'} | 3周 | - |

---

## 5. 结论与决策支持

当前铀矿供应链处于 **${topicData.level}** 状态，建议优先采取以下行动：

1. **立即执行**：${topicData.recommendations[0]}
2. **短期（1个月内）**：${topicData.recommendations[1] || '完成替代航线成本测算'}
3. **中期（3个月）**：${topicData.recommendations[2] || '调整年度采购配额分配'}

---

## 6. 数据集摘要（基于内部样例时序数据）

- 最新观测（${latestPrice ? latestPrice.date : '无数据'}）：U3O8 现货 ${latestPrice ? latestPrice.u3o8 + ' $/lb' : 'N/A'}，长协 ${latestPrice ? latestPrice.longterm + ' $/lb' : 'N/A'}。
- 近期价格变动（对比上期）：${priceChange3m !== null ? priceChange3m + '%' : 'N/A'}（以U3O8现货为准）。
- 最新ISL矿山产能利用率：${latestRefinery !== null ? latestRefinery + '%' : 'N/A'}。
- 全球可用库存（近似）：${latestStocks !== null ? latestStocks + ' 万桶' : 'N/A'}。
- 近30天矿山生产/运输安全相关事件：${dataset && dataset.aisIncidentsLast30d !== undefined ? dataset.aisIncidentsLast30d : 'N/A'} 起。

> 注：上述数据为内置示例时序与聚合指标，用于量化支撑研判。如需接入实盘，应对接 EIA/IEA/Platts 等权威 API，定期同步与回测。

[数据来源: 标普全球商品洞察]  [数据来源: 国际能源署(IEA)]  [数据来源: 彭博新能源财经]
`;
};

// ================= 组件逻辑 =================
const userInput = ref("");
const messages = ref([]);
const loading = ref(false);
const chatWindow = ref(null);
const reportDialogVisible = ref(false);
const selectedReport = ref("");

const webSourceOptions = [
  { label: '标普全球(Platts)', value: 'sp_platts' },
  { label: 'Argus媒体', value: 'argus_media' },
  { label: 'IEA月报', value: 'iea_report' },
  { label: 'EIA数据库', value: 'eia_data' }
];

const osintSourceOptions = [
  { label: '船舶自动识别(AIS)', value: 'ais_monitor' },
  { label: '港口卫星监测', value: 'sat_port' },
  { label: 'WNA/IAEA报告', value: 'opec_news' },
  { label: '地缘政治快讯', value: 'geo_alerts' }
];

const selectedWebSources = ref(webSourceOptions.map(item => item.value));
const selectedOsintSources = ref(osintSourceOptions.map(item => item.value));

const renderedReport = computed(() => {
  if (!selectedReport.value) return "";
  let mdText = selectedReport.value;
  mdText = mdText.replace(/\[\s*数据来源\s*[:：]\s*(.*?)\s*\](?:\((.*?)\))?/g, (match, p1, p2) => {
    if (p2 && p2.trim().startsWith('http')) {
      return `<a href="${p2.trim()}" target="_blank" class="data-source-badge is-link"><i class="el-icon-link"></i> 数据来源: ${p1}</a>`;
    }
    return `<span class="data-source-badge"><i class="el-icon-link"></i> 数据来源: ${p1}</span>`;
  });
  return marked(mdText);
});

const parseStreamContent = (text) => {
  const parts = [];
  let currentText = text || '';
  let thinkStart = currentText.indexOf('<think>');
  let thinkEnd = currentText.indexOf('</think>');

  if (thinkStart !== -1) {
    if (thinkStart > 0) {
      parts.push({ type: 'text', content: currentText.substring(0, thinkStart) });
    }
    if (thinkEnd !== -1) {
      parts.push({ type: 'think', content: currentText.substring(thinkStart + 7, thinkEnd).trim() });
      const remainder = currentText.substring(thinkEnd + 8).trim();
      if (remainder) {
        parts.push({ type: 'text', content: remainder });
      }
    } else {
      parts.push({ type: 'think', content: currentText.substring(thinkStart + 7).trim() });
    }
  } else {
    parts.push({ type: 'text', content: currentText });
  }
  return parts;
};

const getEventTypeName = (event) => {
  const type = event.type;
  if (type === 'tool_start') {
    const content = event.content || '';
    if (content.includes('search_web')) return '🌍 检索宏观能源数据 (search_web)';
    if (content.includes('read_expert_document')) return '📖 查阅WNA/IAEA红皮书 (read_expert_document)';
    if (content.includes('search_osint')) return '🛰️ 采集铀矿生产/运输情报 (search_osint)';
    return '🛠️ 唤起专用工具 (Invoking Tool)';
  }
  if (type === 'tool_end') {
    return '⬅️ 工具返回信息 (Tool Result)';
  }
  const map = {
    'info': '📌 状态 (Info)',
    'stream': '🤖 深度思考中 (Thinking...)',
    'tool_exec': '⚙️ 融合多源数据 (Processing)',
    'error': '❌ 发生错误 (Error)',
    'warning': '⚠️ 警告 (Warning)'
  };
  return map[type] || type;
};

const toggleCollapse = (event) => {
  if (event.type !== 'stream' && event.type !== 'info') {
    event.collapsed = !event.collapsed;
  }
};

const viewReport = (content) => {
  selectedReport.value = content;
  reportDialogVisible.value = true;
};

const scrollToBottom = () => {
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  }
};

const smoothCompleteProgress = (ev) => {
  return new Promise((resolve) => {
    if (!ev || ev.fakeProgress === undefined) {
      resolve();
      return;
    }
    if (ev.completeInterval) {
      clearInterval(ev.completeInterval);
      ev.completeInterval = null;
    }
    const start = Number(ev.fakeProgress || 0);
    const target = 100;
    const duration = 400;
    const startAt = Date.now();
    ev.completeInterval = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const ratio = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      ev.fakeProgress = Math.min(100, start + (target - start) * eased);
      if (ratio >= 1) {
        ev.fakeProgress = 100;
        clearInterval(ev.completeInterval);
        ev.completeInterval = null;
        resolve();
      }
    }, 16);
  });
};

// 模拟Agent分析流程
const simulateAnalysis = async (query, sourceConfig, agentMsg) => {
  agentMsg.events.push({ type: 'tool_start', content: 'search_web: 检索全球铀供需平衡数据', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 600));
  agentMsg.events.push({ type: 'tool_end', content: '✓ 获取最新WNA报告、UxC/TradeTech价格数据', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 500));

  agentMsg.events.push({ type: 'tool_start', content: 'search_osint: 采集关键航道AIS信号', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 700));
  agentMsg.events.push({ type: 'tool_end', content: '✓ 捕获哈萨克斯坦/尼日尔/加拿大铀矿山生产动态', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 500));

  const topicKey = matchOilTopic(query);
  const topicData = oilSupplyChainDB[topicKey];

  // 选取对应的样例数据集（用于在报告中给出数值支撑）
  const dataset = oilDatasets[topicKey] || oilDatasets['default'];

  const thoughtStream = [
    `<think>正在解析查询：「${query}」，识别核心产油区与炼化节点。</think>`,
    `\n关联能源数据库，匹配到「${topicKey}」领域风险模型。当前风险指数为 ${topicData.riskIndex}/100，处于${topicData.level}水平。`,
    `<think>检索到近期关键事件：${topicData.events[0]}、${topicData.events[1]}。这些事件对全球供应稳定性构成实质性影响。</think>`,
    `\n计算脆弱性指标：产能利用率、海运周转天数、地缘风险溢价。`,
    `<think>综合评估后，建议优先执行：${topicData.recommendations[0]}。</think>`
  ];

  for (const chunk of thoughtStream) {
    const lastEvent = agentMsg.events[agentMsg.events.length - 1];
    if (lastEvent && lastEvent.type === 'stream') {
      lastEvent.content += chunk;
    } else {
      agentMsg.events.push({ type: 'stream', content: chunk, collapsed: false, thinkCollapsed: true });
    }
    scrollToBottom();
    await new Promise(r => setTimeout(r, 450));
  }

  const analysisEvent = {
    type: 'tool_exec',
    content: '📊 量化评估：正在融合多源数据生成铀矿供应链报告...',
    fakeProgress: 0,
    collapsed: false
  };
  agentMsg.events.push(analysisEvent);
  scrollToBottom();

  const progressInterval = setInterval(() => {
    if (analysisEvent.fakeProgress < 95) {
      analysisEvent.fakeProgress += Math.random() * 8 + 2;
      if (analysisEvent.fakeProgress > 95) analysisEvent.fakeProgress = 95;
    }
  }, 180);

  await new Promise(r => setTimeout(r, 2800));
  clearInterval(progressInterval);
  analysisEvent.fakeProgress = 100;
  await smoothCompleteProgress(analysisEvent);

  const finalReport = generateReport(query, sourceConfig, topicData, topicKey, dataset);
  agentMsg.events.push({ type: 'report', content: finalReport });
  scrollToBottom();
};

const submitAnalysis = async () => {
  if (!userInput.value.trim() || loading.value) return;

  const query = userInput.value.trim();

  messages.value.push({ role: 'user', content: query });
  userInput.value = "";
  loading.value = true;

  messages.value.push({ role: 'agent', events: [], status: 'running' });
  const agentMsg = messages.value[messages.value.length - 1];

  const sourceConfig = {
    web: selectedWebSources.value,
    osint: selectedOsintSources.value
  };

  try {
    await simulateAnalysis(query, sourceConfig, agentMsg);
    agentMsg.status = 'finished';
    agentMsg.events.forEach(ev => {
      if (ev.type !== 'stream' && ev.type !== 'report' && ev.type !== 'tool_exec') {
        ev.collapsed = true;
      }
    });
  } catch (err) {
    console.error(err);
    agentMsg.events.push({ type: 'error', content: `分析过程出错: ${err.toString()}`, collapsed: false });
    agentMsg.status = 'finished';
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

// 新增：file input 引用
const fileInput = ref(null);

// 深度合并辅助（简单递归合并对象）
const deepMerge = (target = {}, src = {}) => {
  for (const key of Object.keys(src)) {
    const sv = src[key];
    const tv = target[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      target[key] = deepMerge(tv && typeof tv === 'object' ? tv : {}, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
};

const openFileDialog = () => {
  if (fileInput.value) fileInput.value.click();
};

const handleImportFiles = async (e) => {
  const files = e?.target?.files || [];
  if (!files || files.length === 0) {
    ElMessage.warning('未选择文件');
    return;
  }

  let mergedTopics = 0;
  let mergedDatasets = 0;
  let failed = 0;

  for (const file of Array.from(files)) {
    try {
      // 只处理 JSON 文件
      if (!file.name.toLowerCase().endsWith('.json')) continue;
      const text = await file.text();
      const parsed = JSON.parse(text);

      // 如果文件包含 oilSupplyChainDB 或 oilDatasets 字段则合并
      if (parsed.oilSupplyChainDB && typeof parsed.oilSupplyChainDB === 'object') {
        deepMerge(oilSupplyChainDB, parsed.oilSupplyChainDB);
        mergedTopics += Object.keys(parsed.oilSupplyChainDB).length;
      }
      if (parsed.oilDatasets && typeof parsed.oilDatasets === 'object') {
        deepMerge(oilDatasets, parsed.oilDatasets);
        mergedDatasets += Object.keys(parsed.oilDatasets).length;
      }

      // 有时用户导出的可能就是直接的主题对象（未包装字段），尝试智能合并
      // 例如整个文件是 { "霍尔木兹": { ... } }
      const topIsTopicMap = Object.values(parsed).every(v => v && typeof v === 'object' && ('riskIndex' in v || 'priceSeries' in v || 'summary' in v));
      if (topIsTopicMap) {
        // 合并到 oilSupplyChainDB（优先当作 topics）
        deepMerge(oilSupplyChainDB, parsed);
        mergedTopics += Object.keys(parsed).length;
      }

    } catch (err) {
      console.error('导入失败文件', file.name, err);
      failed += 1;
    }
  }

  // 持久化到 localStorage（下次页面加载自动读取）
  try {
    localStorage.setItem('imported_oilSupplyChainDB_v1', JSON.stringify(oilSupplyChainDB));
    localStorage.setItem('imported_oilDatasets_v1', JSON.stringify(oilDatasets));
  } catch (err) {
    console.warn('localStorage 写入失败', err);
  }

  // 提示结果
  ElMessage.success(`导入完成：合并主题 ${mergedTopics} 条，合并数据集 ${mergedDatasets} 条，失败 ${failed} 个文件`);
  // 清空 file input 以便再次选择相同文件/目录
  if (fileInput.value) fileInput.value.value = '';
};

// 页面加载时若 localStorage 存在已导入的持久化数据则合并加载
onMounted(() => {
  try {
    const savedTopics = localStorage.getItem('imported_oilSupplyChainDB_v1');
    const savedDatasets = localStorage.getItem('imported_oilDatasets_v1');
    if (savedTopics) {
      const parsed = JSON.parse(savedTopics);
      if (parsed && typeof parsed === 'object') {
        deepMerge(oilSupplyChainDB, parsed);
      }
    }
    if (savedDatasets) {
      const parsed = JSON.parse(savedDatasets);
      if (parsed && typeof parsed === 'object') {
        deepMerge(oilDatasets, parsed);
      }
    }
  } catch (err) {
    console.warn('加载本地持久化数据库失败', err);
  }
});
</script>

<style scoped>
/* 样式直接复用 ReportGeneration.vue 的逻辑，保持视觉一致性 */
.report-page {
  padding: 1px;
  background-color: #f5f7fa;
  min-height: 50vh;
  box-sizing: border-box;
}

.situation-analysis-container {
  width: 100%;
  height: calc(100vh - 40px);
  background-color: #f5f7fa;
  display: flex;
  justify-content: center;
}

.chat-wrapper {
  background: #ffffff;
  width: 100%;
  max-width: 1600px;
  border-radius: 20px;
  border: 1px solid #e9ebf0;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: #ffffff;
  padding: 18px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eef2f6;
  flex-shrink: 0;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #b91c1c); /* 调整为红色系，符合铀矿/核能主题 */
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.header-subtitle {
  font-size: 13px;
  color: #5b6e8c;
  background: #f1f5f9;
  padding: 5px 14px;
  border-radius: 30px;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  background-color: #fafcff;
  scroll-behavior: smooth;
}

.welcome-screen {
  text-align: center;
  margin-top: 8vh;
  color: #4b5e7a;
}

.welcome-icon {
  font-size: 70px;
  margin-bottom: 20px;
}

.welcome-screen h2 {
  font-size: 26px;
  color: #0f172a;
  margin-bottom: 14px;
}

.welcome-screen p {
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
  color: #475569;
}

.message-box {
  display: flex;
  margin-bottom: 28px;
  animation: fadeSlideUp 0.25s ease-out;
}

.message-box.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #b91c1c; /* 调整为红色系 */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  margin: 0 16px;
  box-shadow: 0 4px 10px rgba(185, 28, 28, 0.15);
}

.message-box.agent .avatar {
  background: #1e3a5f;
}

.message-content {
  max-width: 78%;
}

.user-text {
  background: #b91c1c; /* 调整为红色系 */
  color: white;
  padding: 12px 22px;
  border-radius: 24px;
  border-bottom-right-radius: 6px;
  font-size: 15px;
  line-height: 1.45;
  box-shadow: 0 2px 8px rgba(185, 28, 28, 0.2);
}

.agent-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.interactive-block {
  background: #ffffff;
  border: 1px solid #e9edf2;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.block-header {
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #1e2f41;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid transparent;
}

.block-header.is-clickable {
  cursor: pointer;
}

.block-header.is-clickable:hover {
  background: #f8fafd;
}

.interactive-block:not(:last-child) .block-header {
  border-bottom-color: #eff3f8;
}

.block-icon {
  margin-right: 12px;
  font-size: 16px;
}

.stream .block-icon { color: #3b82f6; }
.tool_start .block-icon { color: #f59e0b; }
.tool_end .block-icon { color: #10b981; }
.error .block-icon { color: #ef4444; }

.block-title {
  flex: 1;
}

.collapse-icon {
  color: #94a3b8;
  font-size: 13px;
}

.block-body {
  padding: 18px 22px;
  background: #fefefe;
  border-top: 1px solid #eff3f8;
}

.body-text {
  font-size: 14px;
  color: #1e2a3e;
  line-height: 1.65;
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

.progress-wrapper {
  margin-top: 16px;
}

.report-action {
  margin: 10px 0 6px;
}

.chat-footer {
  padding: 20px 28px 24px;
  background: white;
  border-top: 1px solid #ecf3fa;
  flex-shrink: 0;
}

.input-container {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.action-input {
  flex: 1;
}

.action-input :deep(.el-textarea__inner) {
  border-radius: 20px;
  padding: 12px 18px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  min-height: 52px !important;
  border-color: #dce3ec;
}

.action-input :deep(.el-textarea__inner):focus {
  border-color: #b91c1c; /* 调整为红色系 */
  box-shadow: 0 0 0 2px rgba(185, 28, 28, 0.1);
}

.send-btn {
  height: 52px;
  padding: 0 32px;
  border-radius: 32px;
  font-weight: 600;
  background: #b91c1c; /* 调整为红色系 */
  border-color: #b91c1c;
  font-size: 15px;
}

.send-btn:hover {
  background: #991b1b;
  border-color: #991b1b;
}

.source-popover-btn {
  height: 52px;
  border-radius: 32px;
  border-color: #d0d8e4;
  background: white;
  padding: 0 18px;
}

.source-count {
  margin-left: 8px;
  background: #fee2e2;
  padding: 2px 10px;
  border-radius: 30px;
  font-size: 12px;
  color: #b91c1c;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
}

.think-block {
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
  border-radius: 12px;
  margin: 12px 0;
}

.think-header {
  padding: 10px 16px;
  font-size: 13px;
  color: #b45309;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-weight: 500;
}

.think-body {
  padding: 12px 16px;
  font-size: 13px;
  background: #fff7e6;
  color: #7c5e2c;
  white-space: pre-wrap;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 报告样式美化 */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  line-height: 1.7;
  color: #1f2d3d;
}

.markdown-body :deep(h1) {
  font-size: 26px;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 3px solid #b91c1c; /* 调整为红色系 */
  color: #2c0b0e;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin-top: 28px;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 5px solid #b91c1c; /* 调整为红色系 */
  color: #3a1215;
}

.markdown-body :deep(h3) {
  font-size: 17px;
  font-weight: 600;
  margin-top: 20px;
  color: #4a181b;
}

.markdown-body :deep(p) {
  margin-bottom: 14px;
  line-height: 1.7;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 18px 0;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: #fef2f2;
  font-weight: 600;
  color: #7f1d1d;
}

.markdown-body :deep(tr:hover) {
  background-color: #fafaf9;
}

.markdown-body :deep(blockquote) {
  margin: 18px 0;
  padding: 12px 20px;
  background-color: #fef2f2;
  border-left: 5px solid #b91c1c;
  color: #7f1d1d;
  border-radius: 12px;
}

.data-source-badge {
  display: inline-flex;
  align-items: center;
  background: #eef4ff;
  color: #1e4a7a;
  padding: 4px 12px;
  border-radius: 24px;
  font-size: 12px;
  margin: 0 6px;
  text-decoration: none;
  font-weight: 500;
}

a.data-source-badge:hover {
  background: #d9e9ff;
  cursor: pointer;
}

.report-markdown {
  background: #fefefe;
  border-radius: 16px;
}

/* 知识库按钮样式（保持简洁） */
.kb-btn {
  border-radius: 28px;
  padding: 8px 14px;
  font-weight: 600;
  color: #1e2f41;
  border: 1px solid #e6edf6;
  background: #fff;
}
</style>
