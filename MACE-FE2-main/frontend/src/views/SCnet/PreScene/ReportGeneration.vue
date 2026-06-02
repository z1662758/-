<template>
  <div class="report-page">
    <div class="situation-analysis-container">
      <div class="chat-wrapper">
        <div class="chat-header">
          <div class="header-title">
            <span><el-icon><Monitor /></el-icon> 供应链分析</span>
          </div>
          <div class="header-subtitle">领域知识 & 数据驱动分析 Agent</div>
        </div>
        
        <div class="chat-body" ref="chatWindow">
          <div v-if="messages.length === 0" class="welcome-screen">
            <div class="welcome-icon">🚚📦</div>
            <h2>供应链分析 Agent 已就绪</h2>
            <p>你好，我是一个基于供应链数据分析的 Agent，我会进行量化风险评估并生成完整报告。</p>
            <p style="font-size:13px; margin-top:8px; color:#6c86a3;">示例：分析2025年半导体供应链中断风险 | 评估越南制造业韧性 | 红海航线对欧洲供应链影响</p>
          </div>

          <div v-for="(msg, idx) in messages" :key="idx" :class="['message-box', msg.role]">
            <div class="avatar">
              {{ msg.role === 'user' ? '提问' : '系统' }}
            </div>
            <div class="message-content">
              <div v-if="msg.role === 'user'" class="user-text">
                {{ msg.content }}
              </div>
              <div v-else class="agent-timeline">
                <div v-for="(event, eIdx) in msg.events" :key="eIdx" :class="['event-block', event.type]">
                  
                  <div v-if="event.type === 'report'" class="report-action">
                    <el-button type="success" :icon="Document" @click="viewReport(event.content)">
                      点击查看最终分析报告
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
                                <i class="el-icon-magic-stick"></i> 思维过程 (Thought)
                                <i :class="event.thinkCollapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
                              </div>
                              <el-collapse-transition>
                                <pre v-show="!event.thinkCollapsed" class="think-body">{{ part.content }}</pre>
                              </el-collapse-transition>
                            </div>
                            <pre v-else class="body-text">{{ part.content }}</pre>
                          </div>
                        </template>
                        <template v-else-if="event.content && (event.content.includes('研判分析') || event.content.includes('生成报告'))">
                          <pre class="body-text">{{ event.content }}</pre>
                          <div class="progress-wrapper">
                            <el-progress
                              class="soft-progress"
                              :percentage="event.fakeProgress || 0"
                              :stroke-width="14"
                              :show-text="false"
                              color="#2d6a4f"
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
              placeholder="请输入你想分析的内容（例：分析2025年半导体供应链的潜在中断风险）"
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
                  信息源
                  <span class="source-count">{{ selectedWebSources.length + selectedOsintSources.length }}</span>
                </el-button>
              </template>
              <div class="source-popover-body">
                <div class="source-popover-title">信息源配置</div>
                <div class="source-section">
                  <div class="group-title">Web</div>
                  <el-checkbox-group v-model="selectedWebSources" class="source-grid">
                    <el-checkbox v-for="item in webSourceOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
                  </el-checkbox-group>
                </div>
                <div class="source-section">
                  <div class="group-title">OSINT</div>
                  <el-checkbox-group v-model="selectedOsintSources" class="source-grid">
                    <el-checkbox v-for="item in osintSourceOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
                  </el-checkbox-group>
                </div>
              </div>
            </el-popover>
            <el-button type="primary" class="send-btn" :loading="loading" @click="submitAnalysis">
              <span>{{ loading ? '分析中...' : '发送请求' }}</span>
              <el-icon class="el-icon--right"><Position /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <el-dialog title="分析报告详情" v-model="reportDialogVisible" width="88%" top="4vh" custom-class="report-dialog">
        <div class="report-markdown" style="padding: 0; min-height: 500px; display: flex; flex-direction: column;">
          <div class="markdown-body" v-html="renderedReport" style="padding: 24px; max-height: 78vh; overflow-y: auto;"></div>
        </div>
        <template v-slot:footer>
          <span class="dialog-footer">
            <el-button type="primary" @click="reportDialogVisible = false">关闭报告</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { marked } from 'marked';
import { Monitor, Position, Document } from '@element-plus/icons-vue';

// ================= 内嵌供应链数据（模拟后端） =================
const supplyChainDB = {
  "半导体": {
    riskIndex: 78,
    level: "高危",
    summary: "全球半导体供应链面临地缘政治碎片化风险，台积电、三星先进制程扩产延迟，成熟制程汽车芯片持续紧缺。",
    events: ["美日荷联合限制半导体设备出口", "马来西亚封测产能受极端天气影响", "AI芯片需求激增挤压传统芯片供应", "日本地震影响硅晶圆厂产能"],
    recommendations: ["建立关键芯片安全库存（≥8周）", "评估东南亚封测替代供应商", "加大多源采购与长期协议锁定"]
  },
  "新能源电池": {
    riskIndex: 64,
    level: "中危",
    summary: "锂矿价格剧烈波动，欧盟电池法案合规成本上升，北美IRA补贴推动本土供应链重构，中国企业海外布局加速。",
    events: ["智利锂资源国有化政策推进", "宁德时代匈牙利工厂环评争议", "石墨出口管制影响日韩电池企业", "固态电池技术突破带来不确定性"],
    recommendations: ["布局锂矿权益与回收体系", "动态调整库存应对价格波动", "跟踪欧美本地化生产补贴"]
  },
  "红海航线": {
    riskIndex: 89,
    level: "高危",
    summary: "胡塞武装袭击导致商船绕行好望角，亚欧航线运力削减约25%，海运费率暴涨，保险附加费飙升。",
    events: ["苏伊士运河收入大幅下降", "中欧班列订舱量激增300%", "燃油成本跳涨推高综合运费", "港口拥堵转移至地中海枢纽"],
    recommendations: ["评估绕行替代路线（铁海联运）", "增加关键零部件空运预案", "与货代锁定长期运力合约"]
  },
  "越南制造": {
    riskIndex: 45,
    level: "低危",
    summary: "电子产业链复苏强劲，三星、富士康持续扩产，但电力短缺与熟练工缺口制约长期产能爬坡。",
    events: ["三星扩建北宁工厂（手机/半导体）", "劳动力成本年增8%", "绿色电力协议落地缓慢", "北部工业区限电影响生产"],
    recommendations: ["投资员工培训与自动化", "签订绿电购电协议", "分散布局至越南北部与南部"]
  },
  "default": {
    riskIndex: 52,
    level: "中危",
    summary: "供应链整体韧性中等，建议关注地缘热点与物流通道波动，加强二级供应商可见性。",
    events: ["全球物流成本趋于稳定", "RCEP深化区域贸易便利化", "数字化采购渗透率提升", "库存策略回归常态化"],
    recommendations: ["实施供应链映射（SCM）", "建立风险预警仪表盘", "定期压力测试"]
  }
};

// 关键词匹配逻辑
const matchSupplyChainTopic = (query) => {
  const lower = query.toLowerCase();
  if (lower.includes('半导体') || lower.includes('芯片') || lower.includes('chip')) return '半导体';
  if (lower.includes('电池') || lower.includes('锂') || lower.includes('新能源') || lower.includes('ev')) return '新能源电池';
  if (lower.includes('红海') || lower.includes('航线') || lower.includes('航运') || lower.includes('苏伊士')) return '红海航线';
  if (lower.includes('越南') || lower.includes('东南亚制造')) return '越南制造';
  return 'default';
};

// 生成美观报告
const generateReport = (query, sourceConfig, topicData, topicKey) => {
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const sourcesList = [...sourceConfig.web, ...sourceConfig.osint].slice(0, 5).join('、');
  
  return `# 📊 供应链分析报告

**分析主题**：${query}  
**评估日期**：${date}  
**风险指数**：**${topicData.riskIndex}/100**（等级：${topicData.level}）  
**信息源配置**：${sourcesList}

---

## 1. 总体态势研判

${topicData.summary}

---

## 2. 关键扰动事件

${topicData.events.map((e, i) => `- **事件${i+1}**：${e}`).join('\n')}

---

## 3. 韧性提升建议

${topicData.recommendations.map((r, i) => `- **建议${i+1}**：${r}`).join('\n')}

---

## 4. 量化评估

| 指标 | 当前值 | 行业基准 | 状态 |
|------|--------|----------|------|
| 风险暴露指数 | ${topicData.riskIndex} | 50 | ${topicData.riskIndex > 70 ? '⚠️ 高于警戒线' : (topicData.riskIndex > 50 ? '⚡ 需关注' : '✅ 正常')} |
| 供应链中断概率 | ${Math.min(95, topicData.riskIndex + 5)}% | 40% | - |
| 恢复时间预期 | ${topicData.riskIndex > 70 ? '4-6周' : '2-3周'} | 2周 | - |

---

## 5. 结论与行动项

当前供应链处于 **${topicData.level}** 状态，建议优先采取以下行动：

1. **立即执行**：${topicData.recommendations[0]}
2. **短期（1个月内）**：${topicData.recommendations[1] || '建立风险监控看板'}
3. **中期（3个月）**：${topicData.recommendations[2] || '完成替代方案可行性评估'}

> 本报告基于多源开源情报与供应链领域知识引擎生成，仅供参考决策辅助。

[数据来源: 供应链AI实验室](https://supplychain-agent.example)  [数据来源: 全球物流数据库]  [数据来源: 标普全球市场情报]
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
  { label: '维基百科(商)', value: 'wikipedia_biz' },
  { label: '供应链风险周刊', value: 'scm_weekly' },
  { label: 'DuckDuckGo', value: 'duckduckgo' },
  { label: '标普全球', value: 'sp_global' }
];

const osintSourceOptions = [
  { label: '货运情报网', value: 'freightwaves' },
  { label: '航运监测平台', value: 'shipping_monitor' },
  { label: '中国物流与采购联合会', value: 'cflp' },
  { label: '海事执行网', value: 'maritime_exec' }
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
    if (content.includes('search_web')) return '🌍 全网供应链检索 (search_web)';
    if (content.includes('read_expert_document')) return '📖 查阅行业知识库 (read_expert_document)';
    if (content.includes('search_osint')) return '🌐 开源情报采集 (search_osint)';
    return '🛠️ 唤起专用工具 (Invoking Tool)';
  }
  if (type === 'tool_end') {
    return '⬅️ 工具返回信息 (Tool Result)';
  }
  const map = {
    'info': '📌 状态 (Info)',
    'stream': '🤖 思考计算中 (Thinking...)',
    'tool_exec': '⚙️ 处理业务数据 (Processing)',
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
  agentMsg.events.push({ type: 'tool_start', content: 'search_web: 供应链宏观数据检索', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 600));
  agentMsg.events.push({ type: 'tool_end', content: '✓ 获取全球物流绩效指数、制造业PMI、贸易政策动态', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 500));
  
  agentMsg.events.push({ type: 'tool_start', content: 'search_osint: 行业事件/预警采集', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 700));
  agentMsg.events.push({ type: 'tool_end', content: '✓ 采集港口拥堵数据、船公司运价公告、地缘新闻', collapsed: false });
  scrollToBottom();
  await new Promise(r => setTimeout(r, 500));
  
  const topicKey = matchSupplyChainTopic(query);
  const topicData = supplyChainDB[topicKey];
  
  const thoughtStream = [
    `<think>正在解析查询：「${query}」，识别核心供应链节点与风险传导路径。</think>`,
    `\n关联行业数据库，匹配到「${topicKey}」领域风险模型。当前风险指数为 ${topicData.riskIndex}/100，处于${topicData.level}水平。`,
    `<think>检索到近期关键事件：${topicData.events[0]}、${topicData.events[1]}。这些事件对供应稳定性构成实质性影响。</think>`,
    `\n计算脆弱性指标：供应商集中度、物流时间波动率、地缘风险溢价。`,
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
    content: '📊 研判分析：正在融合多源数据生成量化评估报告...',
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
  
  const finalReport = generateReport(query, sourceConfig, topicData, topicKey);
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
</script>

<style scoped>
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
  background: linear-gradient(135deg, #1e293b, #2d6a4f);
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
  background: #2d6a4f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  margin: 0 16px;
  box-shadow: 0 4px 10px rgba(45,106,79,0.15);
}

.message-box.agent .avatar {
  background: #1e3a5f;
}

.message-content {
  max-width: 78%;
}

.user-text {
  background: #2d6a4f;
  color: white;
  padding: 12px 22px;
  border-radius: 24px;
  border-bottom-right-radius: 6px;
  font-size: 15px;
  line-height: 1.45;
  box-shadow: 0 2px 8px rgba(45,106,79,0.2);
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
  border-color: #2d6a4f;
  box-shadow: 0 0 0 2px rgba(45,106,79,0.1);
}

.send-btn {
  height: 52px;
  padding: 0 32px;
  border-radius: 32px;
  font-weight: 600;
  background: #2d6a4f;
  border-color: #2d6a4f;
  font-size: 15px;
}

.send-btn:hover {
  background: #1f543f;
  border-color: #1f543f;
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
  background: #e6f7e6;
  padding: 2px 10px;
  border-radius: 30px;
  font-size: 12px;
  color: #2d6a4f;
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
  border-bottom: 3px solid #2d6a4f;
  color: #0f2c1f;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin-top: 28px;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 5px solid #2d6a4f;
  color: #1a3a2a;
}

.markdown-body :deep(h3) {
  font-size: 17px;
  font-weight: 600;
  margin-top: 20px;
  color: #2c4a3a;
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
  background-color: #f1f8f4;
  font-weight: 600;
  color: #1e3a2f;
}

.markdown-body :deep(tr:hover) {
  background-color: #fafdfb;
}

.markdown-body :deep(blockquote) {
  margin: 18px 0;
  padding: 12px 20px;
  background-color: #f1f8f4;
  border-left: 5px solid #2d6a4f;
  color: #2c4a3a;
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
</style>