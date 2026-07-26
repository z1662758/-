import request from '@/utils/request'

export async function getOntologyGraph(params) {
  return request({ url: '/ontology/graph', method: 'get', params })
}

export async function getOntologyGraphQuery(params) {
  return request({ url: '/ontology/graph/query', method: 'get', params })
}

export async function getOntologyTimeline(params) {
  return request({ url: '/ontology/timeline', method: 'get', params })
}

export async function getOntologyStats() {
  return request({ url: '/ontology/stats', method: 'get' })
}

export async function rebuildOntologyGraph() {
  return request({ url: '/ontology/build', method: 'post' })
}

export async function searchOntology(params) {
  return request({ url: '/ontology/search', method: 'get', params })
}

// ===== Dynamic Network (9-step) =====
export async function getDynamicGraph() {
  return request({ url: '/ontology/dynamic', method: 'get' })
}

export async function getDynamicTimeline() {
  return request({ url: '/ontology/dynamic/timeline', method: 'get' })
}

export async function getDynamicWindow(windowKey) {
  return request({ url: `/ontology/dynamic/window/${windowKey}`, method: 'get' })
}

export async function getDynamicRoles() {
  return request({ url: '/ontology/dynamic/roles', method: 'get' })
}

// ===== OWL 2 DL 本体推理 =====
export async function getOwlStats() {
  return request({ url: '/ontology/owl/stats', method: 'get' })
}

export async function getOwlInferred() {
  return request({ url: '/ontology/owl/inferred', method: 'get' })
}

export async function getOwlRiskPropagation(entity) {
  return request({ url: '/ontology/owl/risk-propagation', method: 'get', params: { entity } })
}

export async function triggerOwlReason(method = 'pellet') {
  return request({ url: '/ontology/owl/reason', method: 'post', data: { method } })
}

// ===== OWL 本体网络（中心性算法 + 推理标签） =====
export async function getOwlNetwork() {
  return request({ url: '/ontology/owl/network', method: 'get' })
}

export async function rebuildOwlNetwork() {
  return request({ url: '/ontology/owl/network/rebuild', method: 'post' })
}

// ===== 供应链本体网络 =====
export async function getUraniumGraph() {
  return request({ url: '/ontology/uranium/graph', method: 'get' })
}

export async function getUraniumDynamicGraph() {
  return request({ url: '/ontology/uranium/dynamic', method: 'get' })
}

export async function getUraniumDynamicTimeline() {
  return request({ url: '/ontology/uranium/dynamic/timeline', method: 'get' })
}

export async function getUraniumDynamicWindow(windowKey) {
  return request({ url: `/ontology/uranium/dynamic/window/${windowKey}`, method: 'get' })
}

export async function getUraniumDynamicRoles() {
  return request({ url: '/ontology/uranium/dynamic/roles', method: 'get' })
}

export async function rebuildUraniumNetwork() {
  return request({ url: '/ontology/uranium/rebuild', method: 'post' })
}

// =====  OWL 本体推理 =====
export async function getUraniumOwlStats() {
  return request({ url: '/ontology/uranium/owl/stats', method: 'get' })
}

export async function getUraniumOwlInferred() {
  return request({ url: '/ontology/uranium/owl/inferred', method: 'get' })
}

export async function getUraniumOwlRiskPropagation(entity) {
  return request({ url: '/ontology/uranium/owl/risk-propagation', method: 'get', params: { entity } })
}

export async function getUraniumOwlNetwork() {
  return request({ url: '/ontology/uranium/owl/network', method: 'get' })
}
