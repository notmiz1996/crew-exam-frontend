<template>
	<!-- ============ 全屏容器（负责背景图 + 居中） ============ -->
	<view class="fullscreen-wrapper">
		<!-- 标题放在顶部固定位置 -->
		<!-- <view class="login-header">
			<text class="login-title">肇庆市船员履职技能大赛</text>
			<text class="login-subtitle">机考系统</text>
		</view> -->
		<!-- 卡片区：考试选择 + 登录表单，居中 -->
		<view class="center-area">
			<!-- 登录表单 -->
			<view v-if="!isShowExamList" class="login-section card">
				<text class="section-title">考生信息</text>
				<view class="form-group">
					<text class="form-label">身份证号</text>
					<input class="form-input" type="text" v-model="idCard" placeholder="请输入18位身份证号" maxlength="18"
						@input="onIdCardInput" />
					<text class="form-hint" v-if="idCard && !isIdCardValid">
						请输入有效的18位身份证号
					</text>
				</view>
				<!-- 错误提示 -->
				<view class="error-message" v-if="errorMsg">
					<text class="error-icon">⚠</text>
					<text>{{ errorMsg }}</text>
				</view>
				<!-- 登录按钮 -->
				<button class="btn-primary login-btn" :disabled="!canVerify" @click="handleVerify">
					{{ logining ? '正在进入考试...' : '进入考试' }}
				</button>
			</view>
			<!-- 考试选择区 -->
			<view v-else class="login-section card">
				<text class="section-title">选择考试</text>
				<view class="candidate-greeting">
					<text class="greeting-icon">👤</text>
					<text class="greeting-text">{{ candidateInfo?.name }} 您好！</text>
				</view>
				<!-- 加载中 -->
				<view v-if="loading" class="loading-text">正在加载考试列表...</view>
				<!-- 无考试 -->
				<view v-else-if="examList.length === 0" class="empty-state">
					<text class="empty-icon">📋</text>
					<text class="empty-text">当前没有可参加的考试</text>
					<text class="empty-hint">请联系管理员确认考试配置</text>
				</view>
				<!-- 考试列表 -->
				<view v-else class="exam-list">
					<!-- 列表 -->
					<view v-for="exam in examList" :key="exam.id" class="exam-item"
						:class="{ 'exam-item--selected': selectedExamId === exam.id }"
						@click="selectedExamId = exam.id">
						<view class="exam-info">
							<text class="exam-name">{{ exam.name }}</text>
							<!-- <text class="exam-time">
								考试时间：{{formatTime(exam.start_time)}} 至 {{ formatTime(exam.end_time) }} 
							</text> -->
							<text class="exam-duration">考试时长：{{ exam.duration_minutes }} 分钟</text>
						</view>
						<view class="exam-status" :class="exam.candidate_status">
						  {{ statusMap[exam.candidate_status]?.icon }}
						  {{ statusMap[exam.candidate_status]?.text }}
						</view>
						<text class="exam-check" v-if="selectedExamId === exam.id">✓</text>
					</view>
					<!-- 错误提示 -->
					<view class="error-message" v-if="errorMsg">
						<text class="error-icon">⚠</text>
						<text>{{ errorMsg }}</text>
					</view>
					<!-- 功能按钮 -->
					<view class="" style="display: flex;">
						<button class="btn-primary go-exam-btn" :disabled="!canStartExam" @click="handleStartExam">
						  {{ joining ? '加入中...' : '开始考试' }}
						</button>
						<button class="btn-primary exit-btn" @click="handleBack">
						  返回
						</button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { verifyCandidate, login } from '@/api/index'
import { saveLoginInfo } from '@/utils/storage'

// ==================== 状态 ====================

/** 控制显示：false=身份证输入页，true=考试列表页 */
const isShowExamList = ref(false)

/** 身份证号 */
const idCard = ref('')

/** 错误提示（两个页面共用，切换时自动清空） */
const errorMsg = ref('')

/** 查询按钮加载中 */
const logining = ref(false)

/** 加入考试按钮加载中 */
const joining = ref(false)

/** 当前考生信息（verify 接口返回的 candidate 对象） */
const candidateInfo = ref(null)

/** 待考考试列表（verify 接口返回的 exams 数组） */
const examList = ref([])

/** 当前选中的考试 ID */
const selectedExamId = ref(null)

// ==================== 计算属性 ====================

/** 身份证号是否有效（18位 + 基本格式校验） */
const isIdCardValid = computed(() => {
  return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard.value)
})

/** 是否可以点击"查询"按钮 */
const canVerify = computed(() => {
  return isIdCardValid.value && !logining.value
})

/** 是否可以点击"开始考试" */
const canStartExam = computed(() => {
  return selectedExamId.value !== null && !joining.value
})

/** 考试状态的显示文本和图标映射 */
const statusMap = {
  not_started:  { icon: '⏳', text: '未开始' },
  in_progress:  { icon: '🖊️', text: '进行中' },
  finished:     { icon: '✅', text: '已结束' },
}

// ==================== 方法 ====================

/** 身份证号输入时：自动转大写 X + 清旧错 */
function onIdCardInput() {
  idCard.value = idCard.value.toUpperCase()
  if (errorMsg.value) errorMsg.value = ''
}

/** 点击"进入考试"——调 verify 接口 */
async function handleVerify() {
  if (!canVerify.value) return

  logining.value = true
  errorMsg.value = ''

  try {
    const res = await verifyCandidate({ id_card: idCard.value })

    if (res.code === 0) {
      // 保存考生信息和考试列表
      candidateInfo.value = res.data.candidate
      examList.value = res.data.exams || []

      // 默认选中第一场考试
      if (examList.value.length > 0) {
        selectedExamId.value = examList.value[0].id
      }

      // 切换到考试列表页
      isShowExamList.value = true
	  console.log("考试列表接口：",res);
    } else {
      errorMsg.value = res.message || '查询失败，请重试'
    }
  } catch (err) {
    // 处理 HTTP 错误码
    if (err.code === 400) {
      const msg = err.data?.id_card?.[0] || '身份证号格式不正确'
      errorMsg.value = msg
    } else if (err.code === 404) {
      errorMsg.value = '未找到该考生信息，请确认身份证号是否正确'
    } else {
      errorMsg.value = '网络连接失败，请检查网络后重试'
    }
    console.error('[Login] 查询失败:', err)
  } finally {
    logining.value = false
  }
}

/** 点击"开始考试"——调 login 接口，进入考试页 */
async function handleStartExam() {
  if (!canStartExam.value) return

  joining.value = true
  errorMsg.value = ''

  try {
    const examId = selectedExamId.value
    const res = await login(examId, idCard.value)

    if (res.code === 0) {
      const data = res.data
      saveLoginInfo(data, idCard.value)

      // 根据 paper_status 跳转
      const status = data.paper_status
      if (status === 'finished') {
        uni.redirectTo({ url: `/pages/result/index?examId=${examId}` })
      } else {
        uni.redirectTo({ url: `/pages/exam/index?examId=${examId}` })
      }
    } else {
      const errorMap = {
        1001: '该身份证号未在本场考试考生名单中，请联系管理员',
        1002: '本场考试已结束',
        1003: '本场考试尚未开始',
        1005: '登录信息异常，请重新尝试',
      }
      errorMsg.value = errorMap[res.code] || res.message || '加入考试失败'
    }
  } catch (err) {
    errorMsg.value = '网络连接失败，请检查网络后重试'
    console.error('[Login] 加入考试失败:', err)
  } finally {
    joining.value = false
  }
}

/** 点击"返回"——回到身份证输入页 */
function handleBack() {
  isShowExamList.value = false
  errorMsg.value = ''
  selectedExamId.value = null
}

/** 格式化时间 */
function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style lang="scss" scoped>
	/* ========== 全屏容器 ========== */
	.fullscreen-wrapper {
		/* 铺满整个视口 */
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;

		/* 🖼️ 背景图铺满全屏 */
		background-image: url('@/static/index-bg.png');
		background-size: contain;
		background-size: 100vw 100vh;
		background-position: center;
		background-repeat: no-repeat;

		/* 用 flex 让内容垂直水平居中 */
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* ========== 标题区（顶部固定） ========== */
	.login-header {
		position: absolute;
		top: 80rpx;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 3;
		/* 不加这个会被 flex 居中影响 */
	}

	.login-title {
		font-size: 40rpx;
		font-weight: 700;
		color: #1a73e8;
		margin-bottom: 8rpx;
		text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.8);
		/* 背景复杂时保证可读 */
	}

	.login-subtitle {
		font-size: 28rpx;
		color: #555;
		text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.8);
	}

	/* ========== 居中的卡片内容区 ========== */
	.center-area {
		width: 100%;
		max-width: 900rpx;
		margin-top: 250px;
		padding: 0 30rpx;
		/* flex 让里面的卡片自然排列，不需要额外居中 */
	}

	/* ========== 卡片共通 ========== */
	.login-section {
		margin-bottom: 30rpx;
	}

	/* 增加卡片白色背景 + 圆角 + 阴影，让内容在背景图上突出 */
	.card {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16rpx;
		padding: 32rpx 28rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
	}

	.section-title {
		display: flex;
		justify-content: center;
		font-size: 40rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
		padding-bottom: 16rpx;
		border-bottom: 2rpx solid #f0f0f0;
	}

	/* ========== 考试列表 ========== */
	.exam-list {
		max-height: 360rpx;
		overflow-y: auto;
	}

	.exam-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 16rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		margin-bottom: 12rpx;
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			border-color: #1a73e8;
			background: #f0f7ff;
		}

		&--selected {
			border-color: #1a73e8;
			background: #e8f0fe;
		}
	}

	.exam-info {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		flex: 1;
		min-width: 0;
	}

	.exam-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #333;
	}

	.exam-time {
		font-size: 24rpx;
		color: #888;
	}

	.exam-duration {
		font-size: 24rpx;
		color: #666;
	}

	.exam-check {
		font-size: 32rpx;
		color: #1a73e8;
		font-weight: 700;
		margin-left: 16rpx;
	}

	/* ========== 加载状态 ========== */
	.loading-text {
		text-align: center;
		padding: 40rpx;
		color: #999;
		font-size: 26rpx;
	}

	/* ========== 空状态 ========== */
	.empty-state {
		text-align: center;
		padding: 40rpx 0;
	}

	.empty-icon {
		font-size: 60rpx;
		display: block;
		margin-bottom: 16rpx;
	}

	.empty-text {
		display: block;
		font-size: 28rpx;
		color: #999;
		margin-bottom: 8rpx;
	}

	.empty-hint {
		display: block;
		font-size: 24rpx;
		color: #bbb;
	}

	/* ========== 表单 ========== */
	.form-group {
		margin-bottom: 20rpx;
	}

	.form-label {
		display: block;
		font-size: 26rpx;
		color: #555;
		margin-bottom: 10rpx;
	}

	.form-input {
		width: 100%;
		height: 80rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		color: #333;
		border: 2rpx solid #d9d9d9;
		border-radius: 8rpx;
		background: #fafafa;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.2s;

		&:focus {
			border-color: #1a73e8;
			background: #fff;
		}

		&::placeholder {
			color: #bbb;
		}
	}

	.form-hint {
		display: block;
		font-size: 22rpx;
		color: #e53e3e;
		margin-top: 6rpx;
	}

	/* ========== 错误提示 ========== */
	.error-message {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 16rpx 20rpx;
		background: #fff5f5;
		border: 1rpx solid #fed7d7;
		border-radius: 8rpx;
		font-size: 26rpx;
		color: #c53030;
		margin-bottom: 16rpx;
	}

	.error-icon {
		font-size: 28rpx;
	}

	/* ========== 登录按钮 ========== */
	.login-btn {
		width: 100%;
		height: 88rpx;
		font-size: 32rpx;
		margin-top: 10rpx;
	}
	
	/* ========== 登录按钮 ========== */
	.go-exam-btn {
		width: 100%;
		height: 88rpx;
		font-size: 32rpx;
		margin-top: 10rpx;
		background-color: aquamarine;
	}
	
	/* ========== 返回按钮 ========== */
	.exit-btn {
		width: 100%;
		height: 88rpx;
		font-size: 32rpx;
		margin-top: 10rpx;
		margin-left: 40rpx;
	}
	
	/* ========== 考生欢迎语 ========== */
	.candidate-greeting {
	  display: flex;
	  align-items: center;
	  gap: 12rpx;
	  padding: 24rpx 0 16rpx;
	  border-bottom: 2rpx solid #f0f0f0;
	  margin-bottom: 20rpx;
	}
	
	.greeting-icon {
	  font-size: 40rpx;
	}
	
	.greeting-text {
	  font-size: 34rpx;
	  font-weight: 600;
	  color: #1a73e8;
	}
	
	/* ========== 考试状态标签 ========== */
	.exam-status {
	  font-size: 22rpx;
	  padding: 4rpx 12rpx;
	  border-radius: 6rpx;
	  margin-left: 12rpx;
	  white-space: nowrap;
	}
	
	.exam-status.not_started {
	  background: #e8f5e9;
	  color: #2e7d32;
	}
	
	.exam-status.in_progress {
	  background: #fff3e0;
	  color: #e65100;
	}
	
	.exam-status.finished {
	  background: #f3e5f5;
	  color: #6a1b9a;
	}
	
</style>