/**
 * 存储工具模块
 *
 * 管理：
 * 1. JWT token / exam_id / candidate_name / id_card
 * 2. 题目标记状态（localStorage 持久化）
 */

const KEYS = {
  TOKEN: 'exam_token',
  EXAM_ID: 'exam_id',
  CANDIDATE_NAME: 'candidate_name',
  ID_CARD: 'exam_id_card',
  PAPER_ID: 'paper_id',
  EXPIRES_AT: 'expires_at',
}

/**
 * 存储登录信息
 * @param {object} data    - 登录接口返回的 data
 * @param {string} idCard  - 身份证号
 */
export function saveLoginInfo(data, idCard) {
  uni.setStorageSync(KEYS.TOKEN, data.token)
  uni.setStorageSync(KEYS.EXAM_ID, data.exam_id)
  uni.setStorageSync(KEYS.CANDIDATE_NAME, data.candidate_name)
  uni.setStorageSync(KEYS.ID_CARD, idCard)
  uni.setStorageSync(KEYS.EXPIRES_AT, data.expires_at)
  // 清除旧 paper_id（新考试）
  uni.removeStorageSync(KEYS.PAPER_ID)
}

/**
 * 清除登录信息（退出登录）
 */
export function clearLoginInfo() {
  Object.values(KEYS).forEach((key) => {
    try { uni.removeStorageSync(key) } catch { /* ignore */ }
  })
  // 同时清除标记状态
  clearAllMarks()
}

/**
 * 检查是否已登录（本地 token 是否存在）
 */
export function isLoggedIn() {
  try {
    return !!uni.getStorageSync(KEYS.TOKEN)
  } catch {
    return false
  }
}

// ==================== 题目标记（T-17） ====================

function getMarkKey(examId, paperId) {
  return `${examId}_${paperId}_marks`
}

/**
 * 获取当前考试的所有标记题目集合
 * @returns {Set<number>} - 标记的题目 pqId 集合
 */
export function getMarkedQuestions() {
  try {
    const examId = uni.getStorageSync(KEYS.EXAM_ID)
    const paperId = uni.getStorageSync(KEYS.PAPER_ID)
    if (!examId || !paperId) return new Set()

    const raw = uni.getStorageSync(getMarkKey(examId, paperId))
    if (!raw) return new Set()

    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

/**
 * 切换某题的标记状态
 * @param {number} pqId        - ExamPaperQuestion ID
 * @param {boolean} mark       - true=标记，false=取消标记
 */
export function toggleMark(pqId, mark) {
  const marks = getMarkedQuestions()
  if (mark) {
    marks.add(pqId)
  } else {
    marks.delete(pqId)
  }
  saveMarks(marks)
}

function saveMarks(marks) {
  try {
    const examId = uni.getStorageSync(KEYS.EXAM_ID)
    const paperId = uni.getStorageSync(KEYS.PAPER_ID)
    if (!examId || !paperId) return

    uni.setStorageSync(
      getMarkKey(examId, paperId),
      JSON.stringify([...marks])
    )
  } catch { /* ignore */ }
}

export function clearAllMarks() {
  try {
    const { keys } = uni.getStorageInfoSync()
    keys.forEach((key) => {
      if (key.endsWith('_marks')) {
        uni.removeStorageSync(key)
      }
    })
  } catch { /* ignore */ }
}

/** 获取身份证号（脱敏显示用） */
export function getIdCard() {
  try {
    return uni.getStorageSync(KEYS.ID_CARD) || ''
  } catch { return '' }
}