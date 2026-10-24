import request from '@/utils/request'

async function read(path) {
  const response = await request({ url: `/domain-models/${path}`, method: 'get', timeout: 60000 })
  if (!response?.success) throw new Error(response?.message || '节点资料加载失败')
  return response.data
}
export const getUraniumDomainNetwork = () => read('uranium-network')
export const getUraniumNodeArchive = id => read(`uranium-nodes/${encodeURIComponent(id)}`)
