/**
 * SCnet 队列 Store
 * 管理实验任务的提交、队列状态和任务历史
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { submitToQueue, getQueueStatus, cancelTask, getQueueHistory } from '@/api/queue'

export const useScnetQueueStore = defineStore('scnetQueue', () => {
  const queueStatus = ref({
    position: 0,
    totalInQueue: 0,
    totalPending: 0,
    totalRunning: 0,
    estimatedWaitTime: 0,
    currentTaskId: null,
    status: 'idle'
  })

  const taskHistory = ref([])

  function updateQueueStatus(data) {
    const totalPending = data.total_pending || 0
    const totalRunning = data.total_running || 0
    const next = {
      ...queueStatus.value,
      totalPending,
      totalRunning,
      totalInQueue: totalPending + totalRunning,
      currentTaskId: data.current_task_id || null,
      estimatedWaitTime: totalPending * 12
    }
    const prev = queueStatus.value
    if (
      prev.totalPending !== next.totalPending
      || prev.totalRunning !== next.totalRunning
      || prev.currentTaskId !== next.currentTaskId
      || prev.estimatedWaitTime !== next.estimatedWaitTime
    ) {
      queueStatus.value = next
    }
  }

  async function fetchQueueStatus() {
    try {
      const response = await getQueueStatus()
      if (response.success) {
        updateQueueStatus(response.data)
      }
    } catch (error) {
      console.error('[QueueStore] 获取队列状态失败:', error)
    }
  }

  async function cancelQueueTask(taskId) {
    try {
      const response = await cancelTask(taskId)
      if (response.success) {
        await fetchQueueStatus()
      }
      return response
    } catch (error) {
      console.error('[QueueStore] 取消任务失败:', error)
      throw error
    }
  }

  async function fetchTaskHistory(limit = 50) {
    try {
      const response = await getQueueHistory(limit)
      if (response.success) {
        const next = response.data || []
        const prev = taskHistory.value
        // 仅在内容变化时替换引用，避免每轮询都触发依赖该数组的组件重渲染
        const sameLength = prev.length === next.length
        const sameContent = sameLength && prev.every((row, i) => {
          const n = next[i]
          return n
            && row.task_id === n.task_id
            && row.status === n.status
            && row.updated_at === n.updated_at
            && row.completed_at === n.completed_at
        })
        if (!sameContent) taskHistory.value = next
      }
    } catch (error) {
      console.error('[QueueStore] 获取任务历史失败:', error)
    }
  }

  async function submitExperimentTask(payload) {
    const response = await submitToQueue(payload || {})
    if (response?.success) {
      await fetchQueueStatus()
      await fetchTaskHistory()
    }
    return response
  }

  return {
    queueStatus,
    taskHistory,
    fetchQueueStatus,
    updateQueueStatus,
    cancelQueueTask,
    submitExperimentTask,
    fetchTaskHistory
  }
})
