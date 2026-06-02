/**
 * WebSocket服务
 * 管理Socket.IO连接以实现实时更新
 */
import { io } from 'socket.io-client'

class WebSocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  /**
   * 连接到WebSocket服务器
   * @param {string} url - 服务器URL
   */
  connect(url = null) {
    if (this.socket && this.connected) {
      console.log('[WebSocket] 已连接')
      return
    }

    const serverUrl =
      url ||
      import.meta.env.VITE_SOCKET_BASE_URL ||
      import.meta.env.VITE_APP_BASE_API ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:9091'

    console.log('[WebSocket] 正在连接:', serverUrl)

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    })

    this.socket.on('connect', () => {
      console.log('[WebSocket] 已连接')
      this.connected = true
      this.reconnectAttempts = 0
      this._notifyListeners('connection', { status: 'connected' })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] 已断开:', reason)
      this.connected = false
      this._notifyListeners('connection', { status: 'disconnected', reason })
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] 连接错误:', error)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] 达到最大重连次数')
        this._notifyListeners('connection', {
          status: 'failed',
          error: '达到最大重连次数'
        })
      }
    })

    // 监听进度更新
    this.socket.on('progress_update', (data) => {
      console.log('[WebSocket] 进度更新:', data)
      this._notifyListeners('progress', data)
    })

    // 监听实验完成
    this.socket.on('experiment_completed', (data) => {
      console.log('[WebSocket] 实验完成:', data)
      this._notifyListeners('completed', data)
    })

    // 监听自定义事件
    this.socket.on('experiment_event', (data) => {
      console.log('[WebSocket] 实验事件:', data)
      this._notifyListeners('event', data)
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      console.log('[WebSocket] 已断开连接')
    }
  }

  /**
   * 订阅实验进度
   * @param {string} experimentId - 实验ID
   */
  subscribeProgress(experimentId) {
    if (!this.socket || !this.connected) {
      console.warn('[WebSocket] 未连接，无法订阅')
      return
    }

    this.socket.emit('subscribe_progress', { experiment_id: experimentId })
    console.log('[WebSocket] 已订阅:', experimentId)
  }

  /**
   * 取消订阅实验进度
   * @param {string} experimentId - 实验ID
   */
  unsubscribeProgress(experimentId) {
    if (!this.socket || !this.connected) {
      return
    }

    this.socket.emit('unsubscribe_progress', { experiment_id: experimentId })
    console.log('[WebSocket] 已取消订阅:', experimentId)
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    // 返回取消订阅函数
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 通知监听器
   * @private
   */
  _notifyListeners(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[WebSocket] 监听器错误 (${event}):`, error)
        }
      })
    }
  }
}

// 导出单例
export default new WebSocketService()
