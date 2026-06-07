/**
 * 轮询定时器模块
 *
 * 每 30 秒调用 /status 接口。
 * 当检测到 status=finished（超时自动交卷）时，自动跳转到成绩页。
 */

import { getPaperStatus } from '@/api/index'

let pollTimer = null
let isPolling = false

/**
 * 开始轮询
 * @param {number} examId
 * @param {function} onStatusChange - 每次轮询的回调，接收 (statusData)
 * @param {function} onTimeout - 超时时回调（自动跳转成绩页）
 */
export function startPolling(examId, onStatusChange, onTimeout) {
  if (isPolling) return
  isPolling = true

  const poll = async () => {
    try {
      const res = await getPaperStatus(examId)
      if (res.code !== 0) {
        console.warn('[Poll] 轮询失败:', res.message)
        return
      }

      const data = res.data

      // 通知调用方状态变更
      if (typeof onStatusChange === 'function') {
        onStatusChange(data)
      }

      // 检测到已交卷（超时自动交卷 或 其他端交卷）
      if (data.status === 'finished') {
        stopPolling()
        if (typeof onTimeout === 'function') {
          onTimeout()
        }
      }
    } catch (err) {
      console.error('[Poll] 轮询异常:', err)
    }
  }

  // 立即执行一次，然后每 30 秒轮询
  poll()
  pollTimer = setInterval(poll, 30000)
}

/**
 * 停止轮询
 */
export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  isPolling = false
}

/**
 * 是否正在轮询
 */
export function isPollingActive() {
  return isPolling
}