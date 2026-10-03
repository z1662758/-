import request from '@/utils/request'

export const listExpertSeminars = () => request({ url: '/expert-seminars', method: 'get' })
export const getExpertSeminar = (id) => request({
  url: `/expert-seminars/${encodeURIComponent(id)}`, method: 'get',
})
export const startExpertSeminar = (question, scenario) => request({
  url: '/expert-seminars', method: 'post', data: { question, scenario },
})
