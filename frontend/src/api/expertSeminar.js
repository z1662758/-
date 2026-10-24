import request from '@/utils/request'

export const getSeminarResearchCatalog = () => request({ url: '/expert-seminars/catalog/research', method: 'get' })
export const getSeminarResearchDefaults = (scenario, question) => request({ url: '/expert-seminars/catalog/research/defaults', method: 'get', params: { scenario, question } })
export const saveSeminarExpertResources = (id, data) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/research-resources`, method: 'put', data })
export const runSeminarResearch = (id, data) => request({ url: `/expert-seminars/${encodeURIComponent(id)}/research/run`, method: 'post', data })
export const replicateSeminarResearch = (id, data) => request({ url: `/expert-seminars/${encodeURIComponent(id)}/research/replicate`, method: 'post', data })

export const listExpertSeminars = () => request({ url: '/expert-seminars', method: 'get' })
export const getExpertSeminar = (id) => request({
  url: `/expert-seminars/${encodeURIComponent(id)}`, method: 'get',
})
export const startExpertSeminar = (question, scenario, options = {}) => request({
  url: '/expert-seminars', method: 'post', data: { question, scenario, ...options },
})
export const suggestExpertSeminar = (question, scenario) => request({
  url: '/expert-seminars/suggest', method: 'post', data: { question, scenario }, timeout: 180000,
})
export const retryExpertSeminar = (id) => request({
  url: `/expert-seminars/${encodeURIComponent(id)}/retry`, method: 'post',
})
export const advanceExpertSeminar = (id) => request({
  url: `/expert-seminars/${encodeURIComponent(id)}/advance`, method: 'post',
})
export const listSeminarExperts = () => request({ url: '/expert-seminars/catalog/experts', method: 'get' })
export const createSeminarExpert = (data) => request({ url: '/expert-seminars/catalog/experts', method: 'post', data })
export const createSeminarExpertPromptVersion = (id, data) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/prompt-versions`, method: 'post', data })
export const updateSeminarExpertRetrieval = (id, data) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/retrieval-config`, method: 'put', data })
export const listSeminarExpertEvaluations = (id) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/evaluations`, method: 'get' })
export const evaluateSeminarExpert = (id) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/evaluations`, method: 'post', timeout: 180000 })
export const listSeminarKnowledge = () => request({ url: '/expert-seminars/catalog/knowledge', method: 'get' })
export const getSeminarKnowledge = (id) => request({ url: `/expert-seminars/catalog/knowledge/${encodeURIComponent(id)}`, method: 'get' })
export const createSeminarKnowledge = (data) => request({ url: '/expert-seminars/catalog/knowledge', method: 'post', data })
export const voteExpertSeminar = (id, voter_id, stance, target = 'topic') => request({ url: `/expert-seminars/${encodeURIComponent(id)}/vote`, method: 'post', data: { voter_id, stance, target } })
export const interactExpertSeminar = (id, data) => request({ url: `/expert-seminars/${encodeURIComponent(id)}/interactions`, method: 'post', data })

export const listSeminarExpertModels = () => request({ url: "/expert-seminars/catalog/models", method: "get" })
export const updateSeminarExpertModel = (id, data) => request({ url: `/expert-seminars/catalog/experts/${encodeURIComponent(id)}/model-config`, method: "put", data })

export const continueExpertSeminarWithEvidence = id => request({ url: `/expert-seminars/${encodeURIComponent(id)}/continue-with-evidence`, method: 'post' })

export const getSeminarDeliberationPolicy = mode => request({ url: '/expert-seminars/catalog/deliberation', method: 'get', params: { mode } })
