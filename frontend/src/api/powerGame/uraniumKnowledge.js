// src/api/powerGame/uraniumKnowledge.js
// Uranium Knowledge Resource API client (Stage K2-D1.1)
// 只读接口:专家文档库 / 研究论文库 / 来源与证据 / 统计
import request from '@/utils/request'

/** 知识资源统计(documents/papers/osint/sources/evidence) */
export function getUraniumKnowledgeSummary() {
  return request.get('/SCnet/uraniumKnowledge/summary')
}

/** 专家文档列表(6 本 Red Book,按 publication_year DESC) */
export function getUraniumDocuments() {
  return request.get('/SCnet/uraniumKnowledge/documents')
}

/** 文档详情(join source + evidence + file endpoints) */
export function getUraniumDocumentDetail(documentId) {
  return request.get(`/SCnet/uraniumKnowledge/documents/${documentId}`)
}

/** 文档 PDF 查看端点(新标签页打开) */
export function uraniumDocumentFileUrl(documentId, download = false) {
  return `/api/SCnet/uraniumKnowledge/documents/${documentId}/file${download ? '?download=1' : ''}`
}

/** 论文详情 */
export function getUraniumPaperDetail(paperId) {
  return request.get(`/SCnet/uraniumKnowledge/papers/${paperId}`)
}

/** 证据详情(含 knowledge_links) */
export function getUraniumEvidenceDetail(evidenceId) {
  return request.get(`/SCnet/uraniumKnowledge/evidence/${evidenceId}`)
}

/** 证据关联 canonical records(分页) */
export function getUraniumEvidenceRecords(evidenceId, datasetId, page = 1, pageSize = 20) {
  return request.get(`/SCnet/uraniumKnowledge/evidence/${evidenceId}/records`, {
    params: { dataset_id: datasetId, page, page_size: pageSize },
  })
}

/** 实体详情(company/mine/deposit/facility) */
export function getUraniumEntityDetail(entityId, type) {
  return request.get(`/SCnet/uraniumKnowledge/entities/${entityId}`, { params: { type } })
}

// ── China Uranium Supply Dashboard (K2-C2) ────────────────
// 真实/诚实语义:国内一次铀产量覆盖率 + 已核验进口伙伴构成。

/** 中国铀供应概览(domestic + imports + share_readiness) */
export function getChinaSupplySummary() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/summary')
}

/** 中国国内一次铀产量覆盖率详情(canonical 审计 + 历史) */
export function getChinaDomesticSupply() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/domestic')
}

/** 指定年份已核验进口伙伴构成(默认最新 2024) */
export function getChinaImportCountries(year) {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/countries', { params: { year } })
}

/** 燃料周期多商品贸易结构(261210/284410/284420),按商品分层,不跨商品合并 */
export function getChinaTradeStructure(year) {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/tradeStructure', { params: { year } })
}

/** 当前态势:自主率(估算) + 国家综合供应贡献指数(主界面唯一数据源) */
export function getChinaCurrentSituation() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/currentSituation')
}

/** K2-SUPPLY-SHARE-1:供应构成语义(自主率/按商品进口结构/综合指数/物理总份额) */
export function getChinaSupplyShareSemantics() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/supplyShareSemantics')
}

/** K2-SUPPLY-SHARE-2:中国铀物理供应平衡(严格口径) */
export function getChinaPhysicalSupplyBalance() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/physicalBalance')
}

/** K2-SUPPLY-SHARE-3F-R:统一供应来源占比(Domestic + 7 海外路线 = 100%,ESTIMATED) */
export function getChinaSourceAllocation() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/sourceAllocation')
}

/** 证据背书路线/节点显示元数据(风险值仍来自 runtime snapshot) */
export function getChinaEvidenceBackedNetwork() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/evidenceBackedNetwork')
}

/** 路线证据归档:web artifacts + 真实 OSINT 事件 + 逐路线证据包(K2-C3E.2) */
export function getChinaRouteEvidence() {
  return request.get('/SCnet/uraniumKnowledge/chinaSupply/routeEvidence')
}

// ── Subject Library (K2-S1) ────────────────────
export function getSubjectsSummary() {
  return request.get('/SCnet/uraniumKnowledge/subjects/summary')
}
export function getSubjects(params) {
  return request.get('/SCnet/uraniumKnowledge/subjects', { params })
}
export function getSubjectDetail(id) {
  return request.get(`/SCnet/uraniumKnowledge/subjects/${id}`)
}
export function getSubjectEvents(id) {
  return request.get(`/SCnet/uraniumKnowledge/subjects/${id}/events`)
}
export function getSubjectRelations(id) {
  return request.get(`/SCnet/uraniumKnowledge/subjects/${id}/relations`)
}
// K2-S1.2 规格命名 alias(同端点)
export const getUraniumSubjectSummary = getSubjectsSummary
export const getUraniumSubjects = getSubjects
export const getUraniumSubject = getSubjectDetail
export const getUraniumSubjectEvents = getSubjectEvents
export const getUraniumSubjectRelations = getSubjectRelations

// ── Environment Library (K2-E1) ────────────────
export function getEnvironmentSummary() {
  return request.get('/SCnet/uraniumKnowledge/environment/summary')
}
export function getEnvironmentDatasets() {
  return request.get('/SCnet/uraniumKnowledge/environment/datasets')
}
export function getEnvironmentDataset(datasetId, params) {
  return request.get(`/SCnet/uraniumKnowledge/environment/datasets/${datasetId}`, { params })
}

// ── Rule Library (K2-R1) ───────────────────────
export function getRulesSummary() {
  return request.get('/SCnet/uraniumKnowledge/rules/summary')
}
export function getRules(params) {
  return request.get('/SCnet/uraniumKnowledge/rules', { params })
}
export function getRuleGroups() {
  return request.get('/SCnet/uraniumKnowledge/rules/groups')
}
export function getRuleDetail(ruleId) {
  return request.get(`/SCnet/uraniumKnowledge/rules/${ruleId}`)
}

// ── Model Library (K2-M1) ──────────────────────
export function getUraniumModelSummary() {
  return request.get('/SCnet/uraniumKnowledge/models/summary')
}
export function getUraniumModels(params) {
  return request.get('/SCnet/uraniumKnowledge/models', { params })
}
export function getUraniumModel(id) {
  return request.get(`/SCnet/uraniumKnowledge/models/${id}`)
}
export function getUraniumModelCategories() {
  return request.get('/SCnet/uraniumKnowledge/models/categories')
}

// ── Professional real-data run (K2-M2) ─────────
/** 单模型真实数据运行(专业模型/通用算法),PARALLEL,不改 runtime risk */
export function runUraniumModel(id, params) {
  return request.get(`/SCnet/uraniumKnowledge/models/${id}/run`, { params })
}

/** 并行专业分析(4 专业模型),输出 analysis_snapshot_id */
export function getProfessionalAnalysis(params) {
  return request.get('/SCnet/uraniumKnowledge/analysis/professional', { params })
}

/** 通用算法真实数据绑定运行 */
export function getAlgorithmAnalysis(params) {
  return request.get('/SCnet/uraniumKnowledge/analysis/algorithms', { params })
}

// ── Expert Views (K2-V1) ───────────────────
export function getExpertViewsSummary() {
  return request.get('/SCnet/uraniumKnowledge/expertViews/summary')
}
export function getExpertViews(params) {
  return request.get('/SCnet/uraniumKnowledge/expertViews', { params })
}
export function getExpertView(id) {
  return request.get(`/SCnet/uraniumKnowledge/expertViews/${id}`)
}

// ── Research Papers (K2-P1) ─────────────────
export function getUraniumPaperSummary() {
  return request.get('/SCnet/uraniumKnowledge/papers/summary')
}
export function getUraniumPapers(params) {
  return request.get('/SCnet/uraniumKnowledge/papers', { params })
}
export function getUraniumPaper(id) {
  return request.get(`/SCnet/uraniumKnowledge/papers/${id}`)
}
export function uraniumPaperFileUrl(id) {
  return `/api/SCnet/uraniumKnowledge/papers/${id}/file`
}

// ── Research Paper Library (K2-P2) ──────────
// 规范要求的 /research-papers 端点(等价 /papers,支持 research_area/country 过滤)
export function getResearchPapers(params) {
  return request.get('/SCnet/uraniumKnowledge/research-papers', { params })
}
export function getResearchPaper(id) {
  return request.get(`/SCnet/uraniumKnowledge/research-papers/${id}`)
}
export function getResearchPaperSummary() {
  return request.get('/SCnet/uraniumKnowledge/research-papers/summary')
}
export function researchPaperFileUrl(id) {
  return `/api/SCnet/uraniumKnowledge/research-papers/${id}/file`
}

