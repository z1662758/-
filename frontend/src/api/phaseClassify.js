/**
 * 供应链阶段智能分类 API
 * 将用户需求发送给后端大模型，由大模型判断属于事前/事中/事后哪个阶段
 */
import request from '@/utils/request'

/**
 * 分析用户需求，返回应跳转的阶段
 * @param {Object} params
 * @param {string} params.message - 用户输入的需求描述
 * @returns {Promise<{phase: string, phaseName: string, reason: string}>}
 */
export async function classifyPhase({ message }) {
  return request({
    url: '/scenario/classify-phase',
    method: 'post',
    data: { message }
  })
}
