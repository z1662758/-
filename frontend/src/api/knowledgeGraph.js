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

export async function getKnowledgeGraphCurrent(params) {
  const payload = await request({
    url: '/domain/graph/current',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '获取图谱失败')
}

export async function getKnowledgeGraphVersions(params) {
  const payload = await request({
    url: '/domain/graph/versions',
    method: 'get',
    params
  })
  return normalizeWrappedResult(payload, '获取图谱版本失败')
}

export async function saveKnowledgeGraphVersion(data) {
  const payload = await request({
    url: '/domain/graph/version/save',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '保存图谱版本失败')
}

export async function loadKnowledgeGraphVersion(data) {
  const payload = await request({
    url: '/domain/graph/version/load',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '加载图谱版本失败')
}

export async function mergeKnowledgeGraph(data) {
  const payload = await request({
    url: '/domain/graph/merge',
    method: 'post',
    data
  })
  return normalizeWrappedResult(payload, '合并图谱失败')
}

export async function exportKnowledgeGraph(params) {
  return request({
    url: '/domain/graph/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

