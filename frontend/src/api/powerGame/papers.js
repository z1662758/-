import axios from 'axios'
import request from '@/utils/request'

/** 获取论文列表 */
export function getPapers(params) {
  return request.get('/powerGame/osint/papers', { params })
}

/** 爬取论文（arXiv） */
export function crawlPapers(keyword, maxResults = 10) {
  return request.post('/powerGame/osint/crawl', { keyword, max_results: maxResults })
}

/** 上传论文PDF（使用原始 axios，避免 request 拦截器将 Content-Type 覆盖为 application/json） */
export function uploadPaper(file) {
  const formData = new FormData()
  formData.append('file', file)
  return axios.post('/api/powerGame/osint/upload', formData).then(r => r.data)
}

/** 删除论文 */
export function deletePaper(filename) {
  return request.post('/powerGame/osint/delete', { filename })
}

/** 下载论文PDF */
export function downloadPaper(filename) {
  return request.get('/powerGame/osint/download', {
    params: { filename },
    responseType: 'blob'
  })
}

/** 获取论文统计 */
export function getPaperStats() {
  return request.get('/powerGame/papers/stats')
}

/** 获取论文关键词 */
export function getPaperKeywords(filename) {
  return request.get('/powerGame/papers/keywords', { params: { filename } })
}

/** 添加论文关键词 */
export function addPaperKeyword(filename, keyword) {
  return request.post('/powerGame/papers/keywords', { filename, keyword })
}

/** 移除论文关键词 */
export function removePaperKeyword(filename, keyword) {
  return request.delete('/powerGame/papers/keywords', {
    data: { filename, keyword }
  })
}

/** LLM扩展论文 */
export function expandPaper(filename) {
  return request.post('/powerGame/papers/expand', { filename })
}

/** 自动分类论文 */
export function categorizePaper(filename) {
  return request.post('/powerGame/papers/categorize', { filename })
}

/** 搜索论文 */
export function searchPapers(params) {
  return request.get('/powerGame/papers/search', { params })
}

// ═══════════════════════════════════════════════
//  Dataset upload — 上传到知识库/数据集
// ═══════════════════════════════════════════════
/** 上传数据集文档（后端: /domain/book/import, 需要 book_name）（使用原始 axios，避免 request 拦截器覆盖 Content-Type） */
export function uploadDataset(file, bookName) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('book_name', bookName || file.name)
  return axios.post('/api/domain/book/import', formData).then(r => r.data)
}

// ═══════════════════════════════════════════════
//  OSINT upload — 上传情报文档/报告
// ═══════════════════════════════════════════════
/** 上传开源情报(文件 + 元数据)。用原始 axios 保留 multipart Content-Type。 */
export function uploadOsint(file, meta = {}) {
  const formData = new FormData()
  if (file) formData.append('file', file)
  Object.entries(meta).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') formData.append(k, v) })
  return axios.post('/api/SCnet/osint/upload', formData).then(r => r.data)
}
