import request from '@/utils/request'

async function call(path = '', method = 'get', data) {
  const response = await request({ url: `/domain-models${path}`, method, data, timeout: 90000 })
  if (!response?.success) throw new Error(response?.message || '领域模型服务未返回有效结果')
  return response.data
}
export const listDomainModels = () => call()
export const getSharedDomainModel = () => call('/shared')
export const useSharedDomainModel = () => call('/shared', 'post', {})
export const getOwlCapabilities = () => call('/owl/capabilities')
export const reasonDomainOwl = (model, mode='schema') => call('/owl/reason', 'post', {model,mode})
export const exportDomainOwl = model => call('/owl/export', 'post', {model})
export const getDomainTemplate = industry => call(`/template?industry=${encodeURIComponent(industry)}`)
export const getDomainModel = (id, version) => call(`/${encodeURIComponent(id)}${version ? `?version=${version}` : ''}`)
export const generateDomainModel = options => call('/generate', 'post', options)
export const validateDomainModel = model => call('/validate', 'post', { model })
export const saveDomainModel = model => call('', 'post', { model })
export const computeDomainModel = (model, instance) => call('/compute', 'post', { model, ...instance })
export const analyzeDomainModel = (model, question, instance, factorIds) => call('/analyze', 'post', { model, question, instance, factor_ids: factorIds })
