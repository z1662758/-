// src/api/powerGame/automotiveKnowledge.js
// AUTO-K1:汽车供应链知识库(domain=supply_chain) 只读 API
import request from '@/utils/request'

/** 九库动态统计 */
export function getAutomotiveKnowledgeSummary() {
  return request.get('/SCnet/automotiveKnowledge/summary')
}

/** 本体(类/关系/约束) */
export function getAutomotiveOntology() {
  return request.get('/SCnet/automotiveKnowledge/ontology')
}

/** 九库列表 */
export function getAutomotiveLibrary(lib) {
  return request.get(`/SCnet/automotiveKnowledge/${lib}`)
}

/** 详情(documents/papers/osint/expertViews/subjects/models/rules) — 含 evidence/sources 与跨库关联 */
export function getAutomotiveItem(lib, id) {
  return request.get(`/SCnet/automotiveKnowledge/${lib}/${encodeURIComponent(id)}`)
}

// ── AUTO-K2-E1:来源 / 证据 / 覆盖率 ──
export function getAutomotiveSources() {
  return request.get('/SCnet/automotiveKnowledge/sources')
}
export function getAutomotiveEvidence() {
  return request.get('/SCnet/automotiveKnowledge/evidence')
}
export function getAutomotiveCoverage() {
  return request.get('/SCnet/automotiveKnowledge/coverage')
}
