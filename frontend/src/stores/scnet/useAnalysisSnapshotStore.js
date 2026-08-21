/**
 * 决策分析「历史快照」Store
 * 跨决策树 / 情景推演 / 博弈论 / 实体图 四个视图共享一个 activeSnapshotId。
 * 选中后所有页面切换到「快照模式」直接读取 mock，不再走后端。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSnapshotById } from '@/views/SCnet/mock/snapshotIndex'

const STORAGE_KEY = 'sc_activeAnalysisSnapshot'

function readPersisted() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export const useAnalysisSnapshotStore = defineStore('analysisSnapshot', () => {
  const activeSnapshotId = ref(readPersisted())

  function setActiveSnapshot(id) {
    activeSnapshotId.value = id || ''
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore quota errors */ }
  }

  function clearSnapshot() {
    setActiveSnapshot('')
  }

  function getActiveSnapshot() {
    return activeSnapshotId.value ? getSnapshotById(activeSnapshotId.value) : null
  }

  return {
    activeSnapshotId,
    setActiveSnapshot,
    clearSnapshot,
    getActiveSnapshot
  }
})
