/**
 * 接口封装模块
 *
 * 所有后端 API 统一通过此模块调用。
 * 自动携带 JWT token 到 Authorization 请求头。
 * 统一处理响应格式 { code, data, message }。
 */

/**
 * 获取存储的 token
 */
function getToken() {
  try {
    return uni.getStorageSync('exam_token') || ''
  } catch {
    return ''
  }
}

/**
 * 获取存储的 exam_id
 */
function getExamId() {
  try {
    return uni.getStorageSync('exam_id') || ''
  } catch {
    return ''
  }
}

/**
 * 通用请求方法
 * @param {string} method - HTTP 方法
 * @param {string} path   - 路径（不含 BASE_URL，如 '/exams/'）
 * @param {object} data   - 请求体（POST/PUT）
 * @param {boolean} auth  - 是否需要 JWT 认证
 * @returns {Promise<{code: number, data: any, message: string}>}
 */
function request(method, path, data = null, auth = false) {
  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json'
    }

    // 需要认证时，自动携带 token
    if (auth) {
      const token = getToken()
      if (!token) {
        reject({ code: 1005, message: '请先登录' })
        return
      }
      header['Authorization'] = `Bearer ${token}`
    }

    uni.request({
      url: `/api${path}`,
      method,
      header,
      data: data ? JSON.stringify(data) : undefined,
      success: (res) => {
        // 调试用，正式发布请移除
        console.log('[API]', method, path, res.data)

        if (res.statusCode === 200 || res.statusCode === 201) {
          const body = res.data
          if (body && typeof body.code === 'number') {
            resolve(body)
          } else {
            // 非标准格式，包装为成功响应
            resolve({ code: 0, data: body, message: '' })
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          // token 无效/过期
          resolve({ code: 1005, message: '登录已过期，请重新登录' })
        } else {
          resolve({
            code: -1,
            data: null,
            message: `请求失败 (${res.statusCode})`
          })
        }
      },
      fail: (err) => {
        // 网络错误
        reject({ code: -1, message: '网络连接失败，请检查网络', detail: err })
      }
    })
  })
}

// ==================== API 方法 ====================

/**
 * 获取当前可参加的考试列表（公开）
 * GET /api/exams/
 */
export function getExamList() {
  return request('GET', '/exams/')
}

/**
 * 考生登录
 * POST /api/exams/{examId}/login/
 * @param {number} examId
 * @param {string} idCard - 身份证号
 */
export function login(examId, idCard) {
  return request('POST', `/exams/${examId}/login/`, { id_card: idCard })
}

/**
 * 获取个人试卷（首次进入自动开始计时）
 * GET /api/exams/{examId}/paper/
 * @param {number} examId
 */
export function getPaper(examId) {
  return request('GET', `/exams/${examId}/paper/`, null, true)
}

/**
 * 提交单题答案
 * POST /api/exams/{examId}/paper-questions/{pqId}/answer/
 * @param {number} examId
 * @param {number} pqId   - ExamPaperQuestion ID
 * @param {string|null} selectedAnswer - 选中的答案字母，null=清空
 */
export function submitAnswer(examId, pqId, selectedAnswer) {
  return request(
    'POST',
    `/exams/${examId}/paper-questions/${pqId}/answer/`,
    { selected_answer: selectedAnswer },
    true
  )
}

/**
 * 获取答卷状态（轮询用）
 * GET /api/exams/{examId}/paper/status/
 * @param {number} examId
 */
export function getPaperStatus(examId) {
  return request('GET', `/exams/${examId}/paper/status/`, null, true)
}

/**
 * 主动交卷
 * POST /api/exams/{examId}/submit/
 * @param {number} examId
 */
export function submitExam(examId) {
  return request('POST', `/exams/${examId}/submit/`, null, true)
}

/**
 * 获取考试成绩
 * GET /api/exams/{examId}/result/
 * @param {number} examId
 */
export function getResult(examId) {
  return request('GET', `/exams/${examId}/result/`, null, true)
}