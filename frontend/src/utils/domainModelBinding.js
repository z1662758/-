// Selections are per industry; scenario submission freezes the stored version on the server.
export const bindingKey = industry => `scnet-domain-binding:${industry}`
export function readDomainBinding(industry) {
  try { return JSON.parse(sessionStorage.getItem(bindingKey(industry)) || 'null') } catch { return null }
}
export function writeDomainBinding(industry, binding) {
  if (binding) sessionStorage.setItem(bindingKey(industry), JSON.stringify(binding))
  else sessionStorage.removeItem(bindingKey(industry))
}
export function selectionPayload(binding) {
  if (!binding?.model_id || !binding.version) return undefined
  return { model_id: binding.model_id, version: binding.version, instance: binding.instance || null, factor_ids: binding.factor_ids }
}
