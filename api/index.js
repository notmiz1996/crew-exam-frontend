/**
 * 接口封装模块
 *
 * 所有后端 API 统一通过此模块调用。
 * 自动携带 JWT token 到 Authorization 请求头。
 * 统一处理响应格式 { code, data, message }。
 *
 * ==================== MOCK 模式 ====================
 * Mock 数据直接内置在此文件中，前端独立调试用。
 * 变量 IS_MOCK = true → 使用 Mock 数据（默认开启）
 * 后端搭好后，将 IS_MOCK 改为 false 即可切回真实 API。
 */

// ==================== Mock 开关 ====================
const IS_MOCK = true    // ← true = 使用模拟数据，false = 走真实后端

// ==================== Mock 数据 ====================

const mockExams = [
  {
    id: 1,
    name: '肇庆市船员履职技能大赛理论知识竞赛',
    start_time: '2026-06-10T09:00:00',
    end_time: '2026-06-30T12:00:00',
    duration_minutes: 120
  }
]

function generateMockPaper() {
  return {
    paper_id: 101,
    status: 'in_progress',
    total_count: 5,
    duration_seconds: 7200,
    remaining_seconds: 7100,
    questions: [
      {
        id: 1, sort_order: 1, question_type: 'single_choice',
        stem: '根据《中华人民共和国内河交通安全管理条例》，船舶在内河航行时，应当如何显示号灯？',
        options: ['A. 仅显示航行灯', 'B. 显示号灯、号型', 'C. 仅显示桅灯', 'D. 不需要显示号灯'],
        score: 1, selected_answer: null
      },
      {
        id: 2, sort_order: 2, question_type: 'single_choice',
        stem: '船舶在能见度不良的情况下航行，应当使用什么声号？',
        options: ['A. 一短声', 'B. 两短声', 'C. 一长声', 'D. 一长两短声'],
        score: 1, selected_answer: null
      },
      {
        id: 3, sort_order: 3, question_type: 'multi_choice',
        stem: '以下哪些属于船舶防污染设备？（多选）',
        options: ['A. 油水分离器', 'B. 生活污水处理装置', 'C. 焚烧炉', 'D. 空调系统'],
        score: 2, selected_answer: null
      },
      {
        id: 4, sort_order: 4, question_type: 'judgment',
        stem: '船舶在航行中，值班驾驶员可以离开驾驶台去餐厅就餐。',
        options: ['正确', '错误'],
        score: 1, selected_answer: null
      },
      {
        id: 5, sort_order: 5, question_type: 'single_choice',
        stem: '根据规定，内河船舶在掉头前应当在多少米外显示掉头信号？',
        options: ['A. 100米', 'B. 200米', 'C. 300米', 'D. 500米'],
        score: 1, selected_answer: null
      },
	  {
	    id: 6, sort_order: 6, question_type: 'single_choice',
	    stem: '根据《中华人民共和国内河交通安全管理条例》，船舶在内河航行时，应当如何显示号灯？',
	    options: ['A. 仅显示航行灯', 'B. 显示号灯、号型', 'C. 仅显示桅灯', 'D. 不需要显示号灯'],
	    score: 1, selected_answer: null
	  },
	  {
	    id: 7, sort_order: 7, question_type: 'single_choice',
	    stem: '船舶在能见度不良的情况下航行，应当使用什么声号？',
	    options: ['A. 一短声', 'B. 两短声', 'C. 一长声', 'D. 一长两短声'],
	    score: 1, selected_answer: null
	  },
	  {
	    id: 8, sort_order: 8, question_type: 'multi_choice',
	    stem: '以下哪些属于船舶防污染设备？（多选）',
	    options: ['A. 油水分离器', 'B. 生活污水处理装置', 'C. 焚烧炉', 'D. 空调系统'],
	    score: 2, selected_answer: null
	  },
	  {
	    id: 9, sort_order: 9, question_type: 'judgment',
	    stem: '船舶在航行中，值班驾驶员可以离开驾驶台去餐厅就餐。',
	    options: ['正确', '错误'],
	    score: 1, selected_answer: null
	  },
	  {
	    id: 10, sort_order:10 , question_type: 'single_choice',
	    stem: '根据规定，内河船舶在掉头前应当在多少米外显示掉头信号？',
	    options: ['A. 100米', 'B. 200米', 'C. 300米', 'D. 500米'],
	    score: 1, selected_answer: null
	  }
    ]
  }
}

// ==================== Mock 状态存储 ====================

// key = paperId, value = { pqId: answer }
const mockAnswerStore = {}
// key = paperId, value = { status, remaining_seconds, answered_count }
const mockStatusStore = {}

function initMockPaper() {
  const paperId = 101
  if (!mockAnswerStore[paperId]) mockAnswerStore[paperId] = {}
  if (!mockStatusStore[paperId]) {
    mockStatusStore[paperId] = {
      status: 'in_progress',
      remaining_seconds: 3600,
      answered_count: 0,
      total_count: 10
    }
  }
  return paperId
}

/** 模拟网络延迟（200~500ms） */
function delay() {
  return new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300))
}

// ==================== Mock 处理函数 ====================

async function mockGetExamList() {
  await delay()
  return { code: 0, data: mockExams, message: '' }
}

async function mockLogin(idCard) {
  await delay()
  // 特殊身份证号 441202199001011234 或以 1 开头 → 有效
  if (idCard !== '441202199001011234' && !idCard.startsWith('1')) {
    return { code: 1001, data: null, message: '该身份证号未在本场考试考生名单中' }
  }
  return {
    code: 0,
    data: {
      token: 'mock_token_' + Date.now(),
      candidate_name: '张三',
      exam_id: 1,
      paper_status: 'in_progress',
      expires_at: '2026-06-30T12:30:00'
    },
    message: ''
  }
}

async function mockGetPaper() {
  await delay()
  const paperId = initMockPaper()
  const paper = generateMockPaper()

  // 恢复已答记录
  const answers = mockAnswerStore[paperId]
  paper.questions.forEach((q) => {
    if (answers[q.id] !== undefined) {
      q.selected_answer = answers[q.id]
    }
  })

  // 如果已交卷，返回 1004
  if (mockStatusStore[paperId].status === 'finished') {
    return { code: 1004, data: null, message: '已交卷，不可操作' }
  }

  return { code: 0, data: paper, message: '' }
}

async function mockSubmitAnswer(pqId, selectedAnswer) {
  await delay()
  const paperId = initMockPaper()
  mockAnswerStore[paperId][pqId] = selectedAnswer

  // 更新已答数量
  const answered = Object.values(mockAnswerStore[paperId]).filter(v => v).length
  mockStatusStore[paperId].answered_count = answered

  return {
    code: 0,
    data: { question_id: pqId, selected_answer: selectedAnswer, saved: true },
    message: ''
  }
}

async function mockGetPaperStatus() {
  await delay()
  const paperId = initMockPaper()
  const st = mockStatusStore[paperId]
  return {
    code: 0,
    data: {
      status: st.status,
      remaining_seconds: Math.max(0, st.remaining_seconds),
      answered_count: st.answered_count || 0,
      total_count: st.total_count
    },
    message: ''
  }
}

async function mockSubmitExam() {
  await delay()
  const paperId = initMockPaper()
  const st = mockStatusStore[paperId]
  if (st.status === 'finished') {
    return { code: 1004, data: null, message: '已交卷，不可操作' }
  }
  st.status = 'finished'
  const answers = mockAnswerStore[paperId] || {}
  const answered = Object.values(answers).filter(v => v).length
  return { code: 0, data: { total_score: answered * 1 }, message: '' }
}

async function mockGetResult() {
  await delay()
  const paperId = initMockPaper()
  const st = mockStatusStore[paperId]
  if (st.status !== 'finished') {
    return { code: 1010, data: null, message: '考试尚未结束，无法查看成绩' }
  }
  const answers = mockAnswerStore[paperId] || {}
  const answered = Object.values(answers).filter(v => v).length
  return {
    code: 0,
    data: { total_score: answered * 1, submitted_at: new Date().toISOString() },
    message: ''
  }
}

// ==================== 真实请求底层 ====================

function getToken() {
  try { return uni.getStorageSync('exam_token') || '' } catch { return '' }
}

function realRequest(method, path, data = null, auth = false) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
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
        if (res.statusCode === 200 || res.statusCode === 201) {
          const body = res.data
          resolve(body && typeof body.code === 'number'
            ? body
            : { code: 0, data: body, message: '' })
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ code: 1005, message: '登录已过期，请重新登录' })
        } else {
          resolve({ code: -1, data: null, message: `请求失败 (${res.statusCode})` })
        }
      },
      fail: (err) => reject({ code: -1, message: '网络连接失败', detail: err })
    })
  })
}

// ==================== 导出 API 方法 ====================

export function getExamList() {
  if (IS_MOCK) return mockGetExamList()
  return realRequest('GET', '/exams/')
}

export function login(examId, idCard) {
  if (IS_MOCK) return mockLogin(idCard)
  return realRequest('POST', `/exams/${examId}/login/`, { id_card: idCard })
}

export function getPaper(examId) {
  if (IS_MOCK) return mockGetPaper()
  return realRequest('GET',`/exams/${examId}/paper/`, null, true)
}

export function submitAnswer(examId, pqId, selectedAnswer) {
  if (IS_MOCK) return mockSubmitAnswer(pqId, selectedAnswer)
  return realRequest('POST', `/exams/${examId}/paper-questions/${pqId}/answer/`, { selected_answer: selectedAnswer }, true)
}

export function getPaperStatus(examId) {
  if (IS_MOCK) return mockGetPaperStatus()
  return realRequest('GET', `/exams/${examId}/paper/status/`, null, true)
}

export function submitExam(examId) {
  if (IS_MOCK) return mockSubmitExam()
  return realRequest('POST', `/exams/${examId}/submit/`, null, true)
}

export function getResult(examId) {
  if (IS_MOCK) return mockGetResult()
  return realRequest('GET', `/exams/${examId}/result/`, null, true)
}