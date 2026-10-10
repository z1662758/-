// src/api/powerGame/osintKnowledgeGraph.js
import request from '@/utils/request'

/**
 * 从 SCnet 后端获取开源情报事件（按场景分类）
 * @param {string} scenario - 'uranium' | 'supply_chain'
 * @param {string} [keyword] - 可选关键词过滤
 */
export function getScnetOsintEvents(scenario, keyword) {
  return request.get('/SCnet/osint/events', {
    params: { scenario, keyword: keyword || undefined }
  })
}

/**
 * 按来源类型获取情报列表（不含 content/summary，轻量）
 * @param {string} sourceCategory - 'news' | 'social' | 'official'
 * @param {string|null} keyword - 可选关键词过滤
 */
export function getOsintBySourceType(sourceCategory, keyword) {
  return request.get('/powerGame/osint/all_news', {
    params: { source_category: sourceCategory, keyword }
  })
}

/**
 * 获取单条情报详情（含 content 全文）
 * @param {string} newsId
 */
export function getOsintNewsDetail(newsId) {
  return request.get(`/powerGame/osint/news/detail/${newsId}`)
}

/**
 * 获取情报简洁列表（for harness 使用）
 * @param {{ source_category?: string, keyword?: string, limit?: number }} params
 */
export function getOsintSimpleList(params) {
  return request.get('/powerGame/osint/news/simple-list', { params })
}

/**
 * 导入官方文档
 * @param {string|null} category - '军控' | 'H政策' | null(全部)
 */
export function importOfficialDocuments(category) {
  return request.post('/powerGame/osint/official/import', { category })
}

/**
 * 构建知识图谱（调用 LLM 抽取实体关系）
 * @param {string} category - '军控' | 'H政策'
 */
export function buildKnowledgeGraph(category) {
  return request.post('/powerGame/osint/official/build-graph', { category })
}

/**
 * 获取完整图谱数据
 * @param {string} category
 */
export function getFullGraph(category) {
  return request.get('/powerGame/osint/graph', { params: { category } })
}

// ====== 节点 CRUD ======

/**
 * 新增节点
 * @param {{ category: string, label: string, type: string, properties?: object }} data
 */
export function addGraphNode(data) {
  return request.post('/powerGame/osint/graph/nodes', data)
}

/**
 * 更新节点
 * @param {string} id - 节点ID
 * @param {{ label?: string, type?: string, properties?: object }} data
 */
export function updateGraphNode(id, data) {
  return request.put(`/powerGame/osint/graph/nodes/${id}`, data)
}

/**
 * 删除节点（级联删除关联关系）
 * @param {string} id
 */
export function deleteGraphNode(id) {
  return request.delete(`/powerGame/osint/graph/nodes/${id}`)
}

// ====== 关系 CRUD ======

/**
 * 新增关系
 * @param {{ category: string, source_id: string, target_id: string, relation_type: string, properties?: object }} data
 */
export function addGraphEdge(data) {
  return request.post('/powerGame/osint/graph/edges', data)
}

/**
 * 更新关系
 * @param {string} id
 * @param {{ relation_type?: string, properties?: object }} data
 */
export function updateGraphEdge(id, data) {
  return request.put(`/powerGame/osint/graph/edges/${id}`, data)
}

/**
 * 删除关系
 * @param {string} id
 */
export function deleteGraphEdge(id) {
  return request.delete(`/powerGame/osint/graph/edges/${id}`)
}
