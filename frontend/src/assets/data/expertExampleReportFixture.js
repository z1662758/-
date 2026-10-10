/**
 * 「暂时查看案例」临时展示用的固定报告正文。
 *
 * 为什么单独放一个文件:这份正文只属于案例展示,不能进通用的 reportBrief.js 规则,
 * 否则所有真实报告都会显示哈萨克斯坦的内容。
 *
 * 生效范围(只有一处调用):
 *   - 只在 useExpertExampleStore 加载 **report** 阶段案例产物时套用;
 *   - 当前任务的 live 报告、后台生成流程、其他案例阶段(osint/judgment/prediction)、
 *     其他页面都不经过这里;
 *   - 案例包结构、provenance、exampleId、案例标签、任务编号、生成时间、
 *     参考来源、证据条目、模型说明、报告限制等字段原样保留,只替换报告正文。
 *
 * 正文只写一遍:页面上的三段式视图(brief)与复制/导出 / 证据溯源用的分章结构(chapters)
 * 都从下面的 REPORT 常量派生,三处内容一定一致,不会出现页面是新版、复制是旧版。
 *
 * 移除方式:删除本文件,并去掉 useExpertExampleStore 中的一处调用。
 */

const REPORT_TITLE = '2026年第四季度哈萨克斯坦供应链分析报告'

/** 刊头下方的主题标识:只作版面识别,不重复正文内容 */
const REPORT_TOPIC = '铀资源采购 / 跨境运输 / 供应保障'

/** 正文来源:正式报告的连续段落,按「一、二、三」三章组织,第三章含（一）~（四）分小节 */
const REPORT = {
  title: REPORT_TITLE,
  parts: [
    {
      number: '一',
      title: '供应链现状与关键事实',
      paragraphs: [
        '哈萨克斯坦是本次铀采购的主要目标来源国，具备较大规模的铀生产能力和对华交付基础。哈萨克斯坦国家铀公司公布的2026年产量指引为27,500—29,000吨铀，较2025年实际产量有所增长；其对华交付可通过铁路运至中哈边境阿拉山口。由此看，2026年第四季度继续开展哈萨克斯坦来源采购具有现实基础，采购工作的重点应由“是否选择哈萨克斯坦”转向“如何确保合同货物按期到达”。',
        '铀从矿山进入采购方库存，需要经过生产、备货、铁路运输、边境交接和国内接收等环节。哈萨克斯坦年度产量决定了总体供应基础，而具体项目的生产计划、供应商已经承担的合同义务以及交货排期，决定了第四季度能够落实到本次采购的货源。对采购方而言，合同中约定的交货月份、批次安排和迟延补救，比单独引用全国或企业年度产量更有实际意义。',
        '供应链的另一个关键事实是，哈萨克斯坦铀矿主要采用地浸方式生产，硫酸供应与矿山产量密切相关。哈萨克斯坦国家铀公司在公布2026年产量指引时，仍将硫酸供应列为影响产量实现的因素。这意味着采购方在关注年度指引的同时，还应持续关注实际产量、库存和交付情况，并将这些变化与合同执行进度联系起来。',
      ],
    },
    {
      number: '二',
      title: '背景分析',
      paragraphs: [
        '在俄乌战争延续、国际铀市场竞争加剧的背景下，铀采购的关注点已从单一价格逐步扩展到货源稳定、运输可靠和到货时间。哈萨克斯坦处于中亚内陆，其铀产品出口依赖铁路及跨境交接。对于面向中国的采购，阿拉山口方向提供了明确的陆路交付路径；但矿山出货、铁路承运、边境办理和国内接收之间仍需协调。即使供应商具备生产能力，若交货批次安排过于集中，采购方也可能在年底面临到货时间紧张的问题。',
        '生产与运输风险还具有连续传导的特点。硫酸等投入品供应变化，首先影响矿山的生产和备货节奏；出货推迟后，原先安排的铁路运力和边境交接窗口可能需要重新协调；到货时间再向后移动，最终压力会落在国内库存和用料计划上。因此，采购风险不应只在发现运输异常后才处理，而应从合同签订阶段就安排交付批次、时间余量和库存衔接。',
        '价格因素同样需要放在整个供应链中判断。2026年第一季度，公开市场的铀现货交易价格高于上年同期，反映出采购成本受到市场波动影响。但采购方最终承担的成本不仅取决于报价，还包括定价方式、交货条件、运输安排以及延迟交付可能带来的补购成本。若为等待价格回落而推迟全部采购，可能压缩运输和接收时间；若一次性锁定全部需求，又会降低后续调整空间。因而，本次采购更适合把货源、价格和交期放在同一方案中统筹安排。',
        '总体看，哈萨克斯坦来源的主要优势在于较强的生产基础和既有对华铁路交付路径；需要重点管理的是具体合同的货源兑现、跨境交付衔接以及采购节奏。第四季度采购可继续推进，但应采用能够吸收生产和运输波动的安排，而不是将全部用料需求押在单一交货批次上。',
      ],
    },
    {
      number: '三',
      title: '启示与建议',
      subsections: [
        {
          title: '（一）提前落实合同货源，围绕实际用料安排采购',
          paragraphs: [
            '建议将第四季度已确定的用料需求作为优先签约部分，与供应商逐项确认货源归属、可交付数量、装运月份和交货地点。合同应明确货物未按期备妥时的通知与补救责任，使采购方能够及时调整库存和后续批次。对于尚未确定的需求，可保留追加采购安排，在生产和市场情况进一步明朗后执行。',
            '采购规模应与国内用料计划、现有库存和在途货物统一核算。已经有其他合同覆盖的需求，不宜在本次采购中重复锁定；需要在第四季度末前入库的部分，应优先安排在较早批次。这样形成的采购计划，才能同时满足供应保障和库存管理要求。',
          ],
        },
        {
          title: '（二）实行分批交付，打通跨境运输与国内接收',
          paragraphs: [
            '建议将签约货物分成前后衔接的交付批次，避免集中在第四季度末装运。首批货物承担主要的供给保障作用，后续批次用于补足需求和调整库存。每批货物均应对应明确的铁路承运计划、边境交接安排、通关文件和国内接收窗口，并由采购与物流部门共同跟踪。',
            '在合同执行过程中，应把“已生产”“已发运”“已完成边境交接”和“已入库”作为不同状态分别管理。只掌握供应商已发货的信息，还不足以确认国内实际可用库存。若某批货物的预计到货时间后移，应及时调整后续批次、国内库存调拨和备用采购顺序。',
          ],
        },
        {
          title: '（三）分批定价并保留备用来源',
          paragraphs: [
            '建议优先锁定确定性需求对应的货源和交期，同时通过分批定价或约定定价公式，分散一次性采购的价格波动。比较报价时，应同时比较交货条件和到货时间；价格较低但交付保障较弱的方案，未必具有更低的实际采购成本。',
            '对于供应保障要求较高的用料，应维持可衔接的库存，并与其他来源供应商保留备选采购渠道。备用来源的作用是应对哈方交付延期或国内库存低于计划的情况，平时不必机械替代现有合同。采购方应定期结合实际到货、库存消耗和后续需求，决定是否启用备用货源。',
          ],
        },
        {
          title: '（四）建立贯穿生产、运输与库存的跟踪机制',
          paragraphs: [
            '建议由采购、物流和库存管理部门共同维护一份第四季度交付计划，持续核对供应商生产与备货进度、铁路装运、边境交接和国内入库情况。当生产排期或预计到货日期发生变化时，同步评估库存能够覆盖的用料时间，并立即调整采购批次，而不是等到合同交付期限届满后再处理。',
          ],
        },
      ],
      closing: '综合建议：推进2026年第四季度哈萨克斯坦铀采购，以确定性需求为基础签约，采用分批交付和分批定价，并用库存及备用来源保障交付连续性。',
    },
  ],
}

/** 默认页的三段式视图:纯段落与分小节,不做事实卡片、不做摘要压缩 */
function buildBrief() {
  return {
    parts: REPORT.parts.map((part) => {
      if (!part.subsections) {
        return {
          number: part.number,
          title: part.title,
          kind: 'paragraphs',
          lead: '',
          paragraphs: [...part.paragraphs],
          hasContent: part.paragraphs.length > 0,
        }
      }
      return {
        number: part.number,
        title: part.title,
        kind: 'advice',
        items: part.subsections.map((subsection) => ({
          // 小节标题本身已含「（一）」序号,这里不再重复补序号
          ordinal: '',
          title: subsection.title,
          paragraphs: [...subsection.paragraphs],
        })),
        // 结语单独给出:版面上用浅蓝结语框突出,不与（一）~（四）并列成一条建议
        closing: part.closing || '',
        hasContent: part.subsections.length > 0,
      }
    }),
  }
}

/** 复制报告 / 导出 PDF / 证据溯源完整正文用的分章结构,与默认页同一份文字 */
function buildChapters() {
  return REPORT.parts.map((part) => ({
    number: part.number,
    title: part.title,
    summary: '',
    sections: part.subsections
      ? [
          ...part.subsections.map((subsection) => ({
            type: 'paragraphs',
            title: subsection.title,
            paragraphs: [...subsection.paragraphs],
          })),
          ...(part.closing
            ? [{ type: 'paragraphs', title: '', paragraphs: [part.closing] }]
            : []),
        ]
      : [{ type: 'paragraphs', title: '', paragraphs: [...part.paragraphs] }],
  }))
}

/**
 * 把固定的案例正文套到案例包 report 产物上。
 *
 * 只改报告正文与版面配置(metadata.title / chapters / brief / document / executiveSummary),
 * 其余字段——包括 provenance、exampleId 与案例标签、任务编号、生成时间、数据截止、
 * 参考来源、证据条目、模型输出、报告限制、质量审计、阶段状态——原样保留。
 *
 * executiveSummary 置空的原因:它是旧案例报告自己的「决策摘要」(综合结论、风险等级、
 * 建议采购量等)。复制报告与导出 PDF 都会由它生成一节决策摘要,留着就会出现
 * 页面是新正文、复制/导出却多出一段旧结论的情况。清空后复制与导出的正文
 * 与页面完全一致,案例证据仍全部保留在「证据溯源」中。
 *
 * 注意:result.content(后端 to_markdown 快照)保持案例包原值不变。
 * 结构化报告不读它;复制与导出都由 reportMarkdown.toMarkdown(chapters) 按当前正文生成。
 */
export function applyExampleReportFixture(stage, artifact) {
  if (String(stage || '').toLowerCase() !== 'report') return artifact
  if (!artifact || typeof artifact !== 'object') return artifact

  const result = artifact.result
  if (!result || typeof result !== 'object') return artifact

  // 旧版 Markdown 案例没有 structured,不在本次范围内
  const structured = result.structured
  if (!structured || typeof structured !== 'object') return artifact

  return {
    ...artifact,
    result: {
      ...result,
      structured: {
        ...structured,
        metadata: { ...(structured.metadata || {}), title: REPORT.title },
        executiveSummary: {},
        chapters: buildChapters(),
        brief: buildBrief(),
        // 版面配置:仅本案例提供,通用报告不带该字段
        document: { topicLine: REPORT_TOPIC },
      },
    },
  }
}
