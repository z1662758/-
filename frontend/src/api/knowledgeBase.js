import request from '@/utils/request'

function normalizeWrappedResult(payload, fallbackMessage = '') {
  const inner = payload && typeof payload === 'object' ? payload.data : null
  if (inner && typeof inner === 'object' && Object.prototype.hasOwnProperty.call(inner, 'success')) {
    return {
      success: Boolean(inner.success),
      message: inner.message || payload?.message || fallbackMessage,
      data: inner.data
    }
  }

  return {
    success: Boolean(payload?.success),
    message: payload?.message || fallbackMessage,
    data: inner
  }
}

export async function getKnowledgeBookList() {
  const payload = await request({
    url: '/domain/book/list',
    method: 'get'
  })
  return {
    success: Boolean(payload?.success),
    message: payload?.message || '',
    data: Array.isArray(payload?.data) ? payload.data : []
  }
}

export async function importKnowledgeBook(formData) {
  const payload = await request({
    url: '/domain/book/import',
    method: 'post',
    data: formData
  })
  return normalizeWrappedResult(payload, '数据集导入失败')
}

export async function analyzeKnowledgeBook(data) {
  const payload = await request({
    url: '/domain/book/analyse',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '数据集解析失败')
}

export async function getKnowledgeBookProgress(params) {
  const payload = await request({
    url: '/domain/book/progress',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '获取解析进度失败')
}

export async function getKnowledgeBookIndex(params) {
  const payload = await request({
    url: '/domain/book/index',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '获取索引失败')
}

export async function renameKnowledgeBook(data) {
  const payload = await request({
    url: '/domain/book/rename',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '重命名失败')
}

export async function deleteKnowledgeBook(data) {
  const payload = await request({
    url: '/domain/book/delete',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '删除失败')
}

export async function downloadKnowledgeBook(params) {
  return request({
    url: '/domain/book/download',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

export async function queryKnowledgeBook(params) {
  const payload = await request({
    url: '/domain/book/query',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '查询失败')
}

export async function getKnowledgeBookCognitiveModel(params) {
  const payload = await request({
    url: '/domain/book/cognitiveModel',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '知识抽取失败')
}

export async function updateKnowledgeBookTree(data) {
  const payload = await request({
    url: '/domain/book/updateTree',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '目录树更新失败')
}

export async function updateKnowledgeBookCategories(data) {
  const payload = await request({
    url: '/domain/book/updateCategories',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '分类更新失败')
}
