/**
 * 队列管理API
 */
import request from '@/utils/request'

/**
 * 提交实验到队列
 */
export function submitToQueue(params) {
  return request({
    url: '/queue/submit',
    method: 'post',
    data: params
  })
}

/**
 * 获取队列状态
 */
export function getQueueStatus() {
  return request({
    url: '/queue/status',
    method: 'get'
  })
}

/**
 * 取消任务
 */
export function cancelTask(taskId) {
  return request({
    url: `/queue/cancel/${taskId}`,
    method: 'post'
  })
}

/**
 * 获取任务历史
 */
export function getQueueHistory(limit = 20) {
  return request({
    url: '/queue/history',
    method: 'get',
    params: { limit }
  })
}
