/**
 * 接口封装模块
 *
 * 所有后端 API 统一通过此模块调用。
 * 自动携带 JWT token 到 Authorization 请求头。
 * 统一处理响应格式 { code, data, message }。
 */

// ==================== API 基础地址 ====================
// 开发环境：通过 proxy 转发到 Django 后端
// 生产环境：改为完整地址，如 'https://exam.example.com/api'
const API_BASE_URL = 'http://127.0.0.1:8000/api'

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

// ==================== 错误码 → 中文提示映射 ====================
const ERROR_MAP = {
  1000: '请求参数不合法',
  1001: '该身份证号未在本场考试考生名单中',
  1002: '身份证号格式不正确',
  1003: '该考生已在其他设备登录',
  1004: '考试时间已结束',
  1005: '未登录或 token 已过期',
  1006: '考试不存在或不在有效期内',
  1007: '试卷状态异常',
  1008: '答案提交失败',
  1009: '交卷失败，请重试',
  1010: '成绩查询失败',
  1011: '考试尚未结束',
  NETWORK_ERROR: '网络连接失败，请检查网络或后端服务是否启动',
  TIMEOUT: '请求超时，请稍后重试',
}

/**
 * 统一错误提示
 */
function getErrorMessage(code) {
  return ERROR_MAP[code] || `系统错误（${code}）`
}

// ==================== 通用请求方法 ====================

/**
 * 通用请求方法
 * @param {string} method - HTTP 方法
 * @param {string} path   - 路径（不含 API_BASE_URL，如 '/exams/'）
 * @param {object|null} data   - 请求体
 * @param {boolean} auth  - 是否需要 JWT 认证
 * @returns {Promise<{code: number, data: any, message: string}>}
 */
function request(method, path, data = null, auth = false) {
  return new Promise((resolve, reject) => {
    const header = {}

    // 需要认证时，自动携带 token
    if (auth) {
      const token = getToken()
      if (!token) {
        reject({ code: 1005, message: '请先登录' })
        return
      }
      header['Authorization'] = `Bearer ${token}`
    }

    const requestUrl = `${API_BASE_URL}${path}`

    // 构建请求参数
    const requestOptions = {
      url: requestUrl,
      method,
      header,
    }

    // 只有 POST 请求才发 JSON body
    if (method === 'POST' && data !== null) {
      header['Content-Type'] = 'application/json'
      requestOptions.data = JSON.stringify(data)
    }

    uni.request({
      ...requestOptions,
      success: (res) => {
        console.log('[API]', method, requestUrl, res.statusCode, res.data)

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data
          if (body && typeof body.code === 'number') {
            if (body.code === 0) {
              resolve(body)
            } else {
              const message = body.message || getErrorMessage(body.code)
              console.warn('[API] 业务错误', method, requestUrl, body.code, message)
              reject({ code: body.code, message })
            }
          } else {
            resolve({ code: 0, data: body, message: '' })
          }
        } else if (res.statusCode === 401) {
          const message = '登录已过期，请重新登录'
          uni.removeStorageSync('exam_token')
          uni.removeStorageSync('exam_id')
          reject({ code: 1005, message })
        } else if (res.statusCode === 403) {
          reject({ code: 1005, message: '没有权限访问' })
        } else if (res.statusCode === 404) {
          reject({ code: 1006, message: '接口地址不存在，请检查后端路由配置' })
        } else if (res.statusCode === 500) {
          reject({ code: 1000, message: '服务器内部错误，请联系管理员' })
        } else {
          reject({ code: 1000, message: `请求失败（${res.statusCode}）` })
        }
      },
      fail: (err) => {
        console.error('[API] 网络错误', method, requestUrl, err)
        const message = err.errMsg?.includes('timeout')
          ? ERROR_MAP.TIMEOUT
          : ERROR_MAP.NETWORK_ERROR
        reject({ code: -1, message })
      }
    })
  })
}

// ==================== API 接口 ====================

/**
 * 1️⃣ 获取考试列表（公开，无需登录）
 * GET  /api/exams/
 */
export function getExamList() {
  return request('GET', '/exams/')
}

/**
 * 验证考生身份证号，返回考生信息和待考考试列表
 * POST /api/candidates/verify/
 */
export function verifyCandidate(data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/candidates/verify/`,
      method: 'POST',
      data,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve({ code: 0, data: res.data })
        } else {
          // 把 HTTP 状态码和错误数据抛出去，让页面 catch 里处理
          reject({ code: res.statusCode, data: res.data, message: res.data?.error || '请求失败' })
        }
      },
      fail: (err) => {
        reject({ code: -1, message: '网络连接失败', data: null })
      }
    })
  })
}


/**
 * 2️⃣ 考生登录（公开，无需 JWT）
 * POST /api/exams/{exam_id}/login/
 * @param {number} exam_id  - 考试 ID（放路径中）
 * @param {string} id_card  - 身份证号
 * @param {string} name     - 考生姓名（可选）
 */
export function login(exam_id, id_card, name = '') {
  const body = { id_card }
  if (name) body.name = name
  return request('POST', `/exams/${exam_id}/login/`, body)
}

/**
 * 3️⃣ 获取试卷（需登录）
 * GET  /api/exams/{exam_id}/paper/
 * @param {number} exam_id - 考试 ID
 */
export function getPaper(exam_id) {
  return request('GET', `/exams/${exam_id}/paper/`, null, true)
}

/**
 * 4️⃣ 提交答案（需登录）
 * POST /api/exams/{exam_id}/paper-questions/{pq_id}/answer/
 * @param {number} exam_id - 考试 ID
 * @param {number} pq_id   - 试卷题目 ID
 * @param {string} answer  - 答案（如 "A" 或 "A,B,C"）
 */
export function submitAnswer(exam_id, pq_id, answer) {
  return request('POST', `/exams/${exam_id}/paper-questions/${pq_id}/answer/`, { answer }, true)
}

/**
 * 5️⃣ 获取考试状态，轮询用（需登录）
 * GET  /api/exams/{exam_id}/paper/status/
 * @param {number} exam_id - 考试 ID
 */
export function getPaperStatus(exam_id) {
  return request('GET', `/exams/${exam_id}/paper/status/`, null, true)
}

/**
 * 6️⃣ 交卷（需登录）
 * POST /api/exams/{exam_id}/submit/
 * @param {number} exam_id - 考试 ID
 */
export function submitExam(exam_id) {
  return request('POST', `/exams/${exam_id}/submit/`, {}, true)
}

/**
 * 7️⃣ 获取考试成绩（需登录）
 * GET  /api/exams/{exam_id}/result/
 * @param {number} exam_id - 考试 ID
 */
export function getResult(exam_id) {
  return request('GET', `/exams/${exam_id}/result/`, null, true)
}