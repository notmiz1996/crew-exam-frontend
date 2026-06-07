<template>
	<view class="exam-page">
		<!-- ========== 顶部信息栏 ========== -->
		<view class="exam-header">
			<view class="header-left">
				<text class="header-name">姓名：{{ candidateName }}</text>
				<text class="header-id">身份证：{{ maskedIdCard }}</text>
			</view>
			<view class="header-right">
				<text class="header-count">已答 {{ answeredCount }}/{{ totalCount }} 题</text>
				<text class="header-timer" :class="{ 'timer--warning': remainingSeconds < 300 }">⏱
					{{ formatRemaining }}</text>
			</view>
		</view>
		<!-- ========== 中间作答区域 ========== -->
		<scroll-view class="exam-body" scroll-y>
			<view class="question-card" v-if="currentQuestion">
				<!-- 题目标题 -->
				<view class="question-header">
					<text class="question-number">第 {{ currentQuestion.sort_order }} 题</text>
					<text class="question-type-badge" :class="typeClass(currentQuestion)">
						{{ typeLabel(currentQuestion) }}
					</text>
					<text class="question-score">{{ currentQuestion.score }} 分</text>
				</view>
				<!-- 题干（字体大小受 fontScale 控制） -->
				<view class="question-stem" :style="{ fontSize: stemFontSize + 'rpx' }">
					<text>
					    <text v-if="isMarked(currentQuestion)" class="stem-mark-icon">📍 </text>
					    {{ currentQuestion.stem }}
					  </text>
				</view>
				<!-- 选项（字体大小受 fontScale 控制） -->
				<view v-if="currentQuestion.question_type === 'single_choice'" class="options-list">
					<view v-for="(opt, idx) in currentQuestion.options" :key="idx" class="option-item"
						:class="{ 'option-item--selected': getSelectedAnswer() === getOptionLetter(idx) }"
						:style="{ fontSize: optionFontSize + 'rpx' }" @click="selectOption(getOptionLetter(idx))">
						<view class="option-radio">
							<view class="radio-dot" v-if="getSelectedAnswer() === getOptionLetter(idx)"></view>
						</view>
						<text class="option-text">{{ opt }}</text>
					</view>
				</view>
				<view v-else-if="currentQuestion.question_type === 'multi_choice'" class="options-list">
					<view v-for="(opt, idx) in currentQuestion.options" :key="idx" class="option-item"
						:class="{ 'option-item--selected': isMultiSelected(getOptionLetter(idx)) }"
						:style="{ fontSize: optionFontSize + 'rpx' }" @click="toggleMultiOption(getOptionLetter(idx))">
						<view class="option-checkbox">
							<text class="checkbox-mark" v-if="isMultiSelected(getOptionLetter(idx))">✓</text>
						</view>
						<text class="option-text">{{ opt }}</text>
					</view>
				</view>
				<view v-else-if="currentQuestion.question_type === 'judgment'" class="options-list">
					<view v-for="opt in judgmentOptions" :key="opt.value" class="option-item"
						:class="{ 'option-item--selected': getSelectedAnswer() === opt.value }"
						:style="{ fontSize: optionFontSize + 'rpx' }" @click="selectOption(opt.value)">
						<view class="option-radio">
							<view class="radio-dot" v-if="getSelectedAnswer() === opt.value"></view>
						</view>
						<text class="option-text">{{ opt.label }}</text>
					</view>
				</view>
				<view v-else class="unknown-type"><text>未知题型</text></view>
			</view>
			<view v-else class="empty-question"><text>没有题目数据</text></view>
		</scroll-view>
		 <!-- ========== 底部工具栏 ========== -->
		<view class="exam-toolbar">
		  <view class="toolbar-inner">
			<button class="tool-btn" @click="fontZoomIn" :disabled="stemFontSize >= 54">
			  <text class="tool-icon">🔍+</text>
			  <text class="tool-label">放大</text>
			</button>
	
			<button class="tool-btn" @click="fontZoomOut" :disabled="stemFontSize <= 24">
			  <text class="tool-icon">🔍−</text>
			  <text class="tool-label">缩小</text>
			</button>
	
			<view class="tool-divider"></view>
	
			<button class="tool-btn" @click="prevQuestion" :disabled="currentIndex <= 0">
			  <text class="tool-icon">◀</text>
			  <text class="tool-label">上一题</text>
			</button>
	
			<button class="tool-btn" @click="showNextQuestion" :disabled="currentIndex >= questions.length - 1">
			  <text class="tool-icon">▶</text>
			  <text class="tool-label">下一题</text>
			</button>
	
			<view class="tool-divider"></view>
	
			<button
			  class="tool-btn tool-btn--mark"
			  @click="doMark"
			  :disabled="!currentQuestion || isMarked(currentQuestion)"
			>
			  <text class="tool-icon">📍</text>
			  <text class="tool-label">标记</text>
			</button>
	
			<button
			  class="tool-btn tool-btn--unmark"
			  @click="doUnmark"
			  :disabled="!currentQuestion || !isMarked(currentQuestion)"
			>
			  <text class="tool-icon">🚫</text>
			  <text class="tool-label">取消标记</text>
			</button>
	
			<view class="tool-divider"></view>
	
			<button class="tool-btn" @click="showQuestionCard = true">
			  <text class="tool-icon">📋</text>
			  <text class="tool-label">题卡</text>
			</button>
	
			<button class="tool-btn tool-btn--submit" @click="startSubmit">
			  <text class="tool-icon">📤</text>
			  <text class="tool-label">交卷</text>
			</button>
		  </view>
		</view>
		<!-- ========== 题卡弹出层 ========== -->
		    <view class="popup-overlay" v-if="showQuestionCard" @click="showQuestionCard = false">
		      <view class="popup-content" @click.stop>
		        <view class="popup-header">
		          <text class="popup-title">答题卡</text>
		          <view class="popup-close-btn" @click="showQuestionCard = false">关闭题卡</view>
		        </view>
		
		        <!-- 图例 -->
		        <view class="card-legend">
		          <view class="legend-item">
		            <view class="legend-box legend-box--answered"></view>
		            <text>已作答</text>
		          </view>
		          <view class="legend-item">
		            <view class="legend-box legend-box--marked"></view>
		            <text>标记</text>
		          </view>
		          <view class="legend-item">
		            <view class="legend-box legend-box--unanswered"></view>
		            <text>未作答</text>
		          </view>
		        </view>
		
		        <!-- 题目按钮网格 -->
		        <scroll-view class="card-grid-scroll" scroll-y>
		          <view class="card-grid">
		            <view
		              v-for="q in questions"
		              :key="q.id"
		              class="card-btn"
		              :class="{
		                'card-btn--marked': isMarked(q),
		                'card-btn--answered': !!getAnswerByPqId(q.id) && !isMarked(q),
		                'card-btn--unanswered': !getAnswerByPqId(q.id) && !isMarked(q),
		                'card-btn--current': currentIndex === q.sort_order - 1,
		              }"
		              @click="jumpToQuestion(q.sort_order - 1)"
		            >
		              <text class="card-btn-text">
		                <text v-if="isMarked(q)">📍 </text>
		                第{{ q.sort_order }}题 |
		                <text v-if="getAnswerByPqId(q.id)">{{ getAnswerByPqId(q.id) }}</text>
		                <text v-else>未作答</text>
		              </text>
		            </view>
		          </view>
		        </scroll-view>
		      </view>
		    </view>
		<!-- ========== 交卷三级确认 ========== -->
		<!-- 第 1 次确认 -->
		<view class="modal-overlay" v-if="submitStep === 1" @click="submitStep = 0">
			<view class="modal-content" @click.stop>
				<text class="modal-title">确认交卷</text>
				<view class="modal-body">
					<text class="modal-text">您已完成 {{ answeredCount }}/{{ totalCount }} 题。</text>
					<text class="modal-text" v-if="totalCount - answeredCount > 0">
						还有 {{ totalCount - answeredCount }} 题未作答，确定要交卷吗？
					</text>
					<text class="modal-text" v-else>全部题目已完成，点击确认交卷。</text>
				</view>
				<view class="modal-actions">
					<button class="btn-default" @click="submitStep = 0">取消</button>
					<button class="btn-primary" @click="submitStep = 2">确定</button>
				</view>
			</view>
		</view>
		<!-- 第 2 次确认 -->
		<view class="modal-overlay" v-if="submitStep === 2" @click="submitStep = 0">
			<view class="modal-content" @click.stop>
				<text class="modal-title">请再次确认</text>
				<view class="modal-body">
					<text class="modal-text">交卷后不可撤回，系统将自动批改。</text>
					<text class="modal-text">确定要交卷吗？</text>
				</view>
				<view class="modal-actions">
					<button class="btn-default" @click="submitStep = 0">取消</button>
					<button class="btn-primary" @click="submitStep = 3">确定</button>
				</view>
			</view>
		</view>

		<!-- 第 3 次确认 -->
		<view class="modal-overlay" v-if="submitStep === 3" @click="submitStep = 0">
			<view class="modal-content" @click.stop>
				<text class="modal-title">最后确认</text>
				<view class="modal-body">
					<text class="modal-text">再次确认交卷？</text>
				</view>
				<view class="modal-actions">
					<button class="btn-default" @click="submitStep = 0">取消</button>
					<button class="btn-danger" :disabled="submitting" @click="handleSubmit">
						{{ submitting ? '交卷中...' : '确认交卷' }}
					</button>
				</view>
			</view>
		</view>

		<!-- 加载遮罩 -->
		<view class="loading-overlay" v-if="pageLoading">
			<view class="loading-spinner"></view>
			<text class="loading-text">加载试卷中...</text>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted
	} from 'vue'
	import {
		getPaper,
		submitAnswer,
		submitExam
	} from '@/api/index'
	import {
		getMarkedQuestions,
		toggleMark,
		getIdCard
	} from '@/utils/storage'
	import {
		startPolling,
		stopPolling
	} from '@/utils/timer'

	// ==================== 路由参数 ====================
	const examId = ref(0)
	const candidateName = ref('')
	const idCardRaw = ref('')
	const maskedIdCard = ref('')

	// ==================== 页面状态 ====================
	const pageLoading = ref(true)
	const submitting = ref(false)
	const showQuestionCard = ref(false)
	const submitStep = ref(0) // 0=无弹窗, 1/2/3=三级确认

	const questions = ref([])
	const paperId = ref(0)
	const currentIndex = ref(0)
	const remainingSeconds = ref(0)
	const totalCount = ref(0)
	const answeredCount = ref(0)
	const status = ref('pending')
	const localAnswers = ref({})
	const markedQuestions = ref(new Set())

	// 字体大小控制（步进 ±2）
	const fontSizeOffset = ref(0)   // 0=默认，每按一次 +2 或 -2
	
	const stemFontSize = computed(() => {
	  const size = 32 + fontSizeOffset.value * 2
	  return Math.max(24, Math.min(54, size))
	})
	
	const optionFontSize = computed(() => {
	  const size = 30 + fontSizeOffset.value * 2
	  return Math.max(22, Math.min(52, size))
	})

	const judgmentOptions = [{
			label: '正确',
			value: '正确'
		},
		{
			label: '错误',
			value: '错误'
		},
	]

	// ==================== 计算属性 ====================
	const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

	const formatRemaining = computed(() => {
		const s = remainingSeconds.value
		if (s <= 0) return '00:00'
		const h = Math.floor(s / 3600)
		const m = Math.floor((s % 3600) / 60)
		const sec = s % 60
		const pad = (n) => String(n).padStart(2, '0')
		return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
	})

	const markedCount = computed(() => markedQuestions.value.size)

	// ==================== 生命周期 ====================
	onMounted(() => {
		const pages = getCurrentPages()
		const page = pages[pages.length - 1]
		if (page && page.options) {
			examId.value = parseInt(page.options.examId) || 0
		}

		try {
			candidateName.value = uni.getStorageSync('candidate_name') || ''
		} catch {
			/* ignore */ }

		idCardRaw.value = getIdCard()
		maskedIdCard.value = maskIdCard(idCardRaw.value)

		if (examId.value) {
			loadPaper()
		} else {
			pageLoading.value = false
			uni.showToast({
				title: '参数错误',
				icon: 'none'
			})
		}
	})

	onUnmounted(() => {
		stopPolling()
		stopCountdown()
	})

	// ==================== 数据加载 ====================
	async function loadPaper() {
		pageLoading.value = true
		try {
			const res = await getPaper(examId.value)
			if (res.code === 0) {
				const data = res.data
				paperId.value = data.paper_id
				status.value = data.status
				questions.value = data.questions || []
				totalCount.value = data.total_count || 0
				remainingSeconds.value = data.remaining_seconds || 0

				const answers = {}
				questions.value.forEach((q) => {
					if (q.selected_answer) answers[q.id] = q.selected_answer
				})
				localAnswers.value = answers
				updateAnsweredCount()
				restoreMarks()

				uni.setStorageSync('paper_id', paperId.value)

				if (status.value === 'in_progress') {
					startPolling(examId.value, onPollStatus, onExamTimeout)
					startCountdown()   // ← 启动本地秒级倒计时
				}
			} else if (res.code === 1004) {
				uni.redirectTo({
					url: `/pages/result/index?examId=${examId.value}`
				})
				return
			} else {
				uni.showToast({
					title: res.message || '加载试卷失败',
					icon: 'none'
				})
			}
		} catch (err) {
			console.error('[Exam] 加载试卷失败:', err)
			uni.showToast({
				title: '网络连接失败',
				icon: 'none'
			})
		} finally {
			pageLoading.value = false
		}
	}

	// ==================== 导航 ====================
	function goToQuestion(index) {
		if (index < 0 || index >= questions.value.length) return
		currentIndex.value = index
	}

	function prevQuestion() {
		if (currentIndex.value > 0) currentIndex.value--
	}

	function showNextQuestion() {
		if (currentIndex.value < questions.value.length - 1) currentIndex.value++
	}

	function jumpToQuestion(index) {
		currentIndex.value = index
		showQuestionCard.value = false
	}

	// ==================== 字体缩放 ====================
	function fontZoomIn() {
	  if (stemFontSize.value < 54) fontSizeOffset.value++
	}
	
	function fontZoomOut() {
	  if (stemFontSize.value > 24) fontSizeOffset.value--
	}

	// ==================== 作答逻辑 ====================
	function getSelectedAnswer() {
		const q = currentQuestion.value
		return q ? (localAnswers.value[q.id] || null) : null
	}

	function getOptionLetter(index) {
		return String.fromCharCode(65 + index)
	}

	function selectOption(letter) {
		const q = currentQuestion.value
		if (!q) return
		const newAnswer = getSelectedAnswer() === letter ? null : letter
		localAnswers.value[q.id] = newAnswer
		updateAnsweredCount()
		saveAnswerToServer(q.id, newAnswer)
	}

	function toggleMultiOption(letter) {
		const q = currentQuestion.value
		if (!q) return
		const current = getSelectedAnswer()
		const selected = current ? current.split(',') : []
		const idx = selected.indexOf(letter)
		if (idx >= 0) selected.splice(idx, 1)
		else selected.push(letter)
		const newAnswer = selected.length > 0 ? selected.join(',') : null
		localAnswers.value[q.id] = newAnswer
		updateAnsweredCount()
		saveAnswerToServer(q.id, newAnswer)
	}

	function isMultiSelected(letter) {
		const current = getSelectedAnswer()
		return current ? current.split(',').includes(letter) : false
	}

	function getAnswerByPqId(pqId) {
		return localAnswers.value[pqId] || null
	}

	/** 格式化题卡按钮上的答案文本 */
	function formatCardAnswer(answer) {
		if (!answer) return '—'
		return answer
	}

	function isAnswered(q) {
		return !!localAnswers.value[q.id]
	}

	function updateAnsweredCount() {
		answeredCount.value = Object.keys(localAnswers.value).filter(
			(id) => localAnswers.value[id] !== null && localAnswers.value[id] !== ''
		).length
	}

	async function saveAnswerToServer(pqId, answer) {
		try {
			const res = await submitAnswer(examId.value, pqId, answer)
			if (res.code === 0) {
				const q = questions.value.find((item) => item.id === pqId)
				if (q) q.selected_answer = answer
			} else if (res.code === 1007) {
				uni.showToast({
					title: '考试时间已到',
					icon: 'none'
				})
				setTimeout(() => {
					uni.redirectTo({
						url: `/pages/result/index?examId=${examId.value}`
					})
				}, 1500)
			}
		} catch (err) {
			console.error('[Exam] 保存答案网络错误:', err)
		}
	}

	// ==================== 标记 / 取消标记 ====================
	function restoreMarks() {
	  markedQuestions.value = getMarkedQuestions()
	}
	
	/** 标记当前题目 */
	function doMark() {
	  const q = currentQuestion.value
	  if (!q || isMarked(q)) return
	  toggleMark(q.id, true)
	  markedQuestions.value.add(q.id)
	  markedQuestions.value = new Set(markedQuestions.value)
	}
	
	/** 取消标记当前题目 */
	function doUnmark() {
	  const q = currentQuestion.value
	  if (!q || !isMarked(q)) return
	  toggleMark(q.id, false)
	  markedQuestions.value.delete(q.id)
	  markedQuestions.value = new Set(markedQuestions.value)
	}
	
	/** 判断题目是否已标记 */
	function isMarked(q) {
	  return q ? markedQuestions.value.has(q.id) : false
	}

	// ==================== 倒计时 ====================
	
	let countdownTimer = null
	
	/** 启动本地每秒倒计时 */
	function startCountdown() {
	  stopCountdown() // 确保不会重复启动
	  countdownTimer = setInterval(() => {
	    if (remainingSeconds.value <= 0) {
	      // 时间到，自动交卷
	      stopCountdown()
	      onExamTimeout()
	      return
	    }
	    remainingSeconds.value--
	  }, 1000)
	}
	
	/** 停止倒计时 */
	function stopCountdown() {
	  if (countdownTimer) {
	    clearInterval(countdownTimer)
	    countdownTimer = null
	  }
	}
	
	// ==================== 轮询逻辑 ====================
	
	/** 轮询回调：同步服务端的剩余时间 */
	function onPollStatus(data) {
	  remainingSeconds.value = data.remaining_seconds || 0
	  if (data.answered_count !== undefined) answeredCount.value = data.answered_count
	}
	
	/** 超时回调：自动跳转成绩页 */
	function onExamTimeout() {
	  uni.showToast({ title: '考试时间已到，系统已自动交卷', icon: 'none', duration: 3000 })
	  setTimeout(() => {
	    uni.redirectTo({ url: `/pages/result/index?examId=${examId.value}` })
	  }, 2000)
	}

	// ==================== 交卷三级确认 ====================
	function startSubmit() {
		submitStep.value = 1 // 打开第 1 次确认
	}

	async function handleSubmit() {
		submitting.value = true
		try {
			const res = await submitExam(examId.value)
			if (res.code === 0) {
				const score = res.data.total_score
				submitStep.value = 0
				uni.showToast({
					title: `交卷成功！得分：${score}分`,
					icon: 'success',
					duration: 2000
				})
				stopPolling()
				setTimeout(() => {
					uni.redirectTo({
						url: `/pages/result/index?examId=${examId.value}`
					})
				}, 1500)
			} else if (res.code === 1004) {
				submitStep.value = 0
				uni.redirectTo({
					url: `/pages/result/index?examId=${examId.value}`
				})
			} else if (res.code === 1008) {
				submitStep.value = 0
				uni.showToast({
					title: '考试时间已到，系统已自动交卷',
					icon: 'none'
				})
				setTimeout(() => {
					uni.redirectTo({
						url: `/pages/result/index?examId=${examId.value}`
					})
				}, 1500)
			} else {
				uni.showToast({
					title: res.message || '交卷失败，请重试',
					icon: 'none'
				})
			}
		} catch (err) {
			uni.showToast({
				title: '网络错误，交卷失败',
				icon: 'none'
			})
		} finally {
			submitting.value = false
		}
	}

	// ==================== 工具 ====================
	function maskIdCard(id) {
		if (!id || id.length < 10) return id
		return id.substring(0, 6) + '********' + id.substring(id.length - 4)
	}

	function typeClass(q) {
		const map = {
			single_choice: 'badge-single',
			multi_choice: 'badge-multi',
			judgment: 'badge-judgment'
		}
		return map[q?.question_type] || ''
	}

	function typeLabel(q) {
		const map = {
			single_choice: '单选题',
			multi_choice: '多选题',
			judgment: '判断题'
		}
		return map[q?.question_type] || q?.question_type || ''
	}
</script>

<style lang="scss" scoped>
	/* ==================== 考试页 ==================== */
	.exam-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #f0f2f5;
	}

	/* ---- 顶部信息栏 ---- */
	.exam-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16rpx 30rpx;
		background: linear-gradient(135deg, #1a73e8, #1557b0);
		color: #fff;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.header-name {
		font-size: 26rpx;
		font-weight: 600;
	}

	.header-id {
		font-size: 22rpx;
		opacity: 0.85;
	}

	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4rpx;
	}

	.header-count {
		font-size: 24rpx;
		font-weight: 600;
	}

	.header-timer {
		font-size: 30rpx;
		font-weight: 700;
		font-variant-numeric: tabular-nums;

		&.timer--warning {
			color: #ffd700;
			animation: pulse 1s ease-in-out infinite;
		}
	}

	@keyframes pulse {

		0%,
		100% {
			opacity: 1;
		}

		50% {
			opacity: 0.5;
		}
	}

	/* ---- 中间作答区域 ---- */
	.exam-body {
		flex: 1;
		padding: 24rpx;
		overflow-y: auto;
	}

	.question-card {
		background: #fff;
		border-radius: 12rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
		padding: 30rpx;
	}

	.question-header {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 24rpx;
		flex-wrap: wrap;
	}

	.question-number {
		font-size: 28rpx;
		font-weight: 700;
		color: #333;
	}

	.question-type-badge {
		padding: 4rpx 14rpx;
		font-size: 22rpx;
		border-radius: 6rpx;
		font-weight: 600;

		&.badge-single {
			background: #e8f0fe;
			color: #1a73e8;
		}

		&.badge-multi {
			background: #fce4ec;
			color: #c62828;
		}

		&.badge-judgment {
			background: #e8f5e9;
			color: #2e7d32;
		}
	}

	.question-score {
		font-size: 24rpx;
		color: #888;
	}

	.mark-btn {
		margin-left: auto;
		padding: 6rpx 20rpx;
		font-size: 28rpx;
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;

		&:hover {
			opacity: 1;
		}

		&--active {
			opacity: 1;
		}
	}

	.question-stem {
		color: #333;
		line-height: 1.8;
		margin-bottom: 30rpx;
		white-space: pre-wrap;
		word-break: break-all;
	}

	/* ---- 选项 ---- */
	.options-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.option-item {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
		padding: 20rpx 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;

		&:hover {
			border-color: #a0c4ff;
			background: #f8fbff;
		}

		&--selected {
			border-color: #1a73e8;
			background: #e8f0fe;
		}
	}

	.option-radio {
		width: 36rpx;
		height: 36rpx;
		border: 2rpx solid #ccc;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2rpx;
		transition: border-color 0.15s;

		.option-item--selected & {
			border-color: #1a73e8;
		}
	}

	.radio-dot {
		width: 20rpx;
		height: 20rpx;
		background: #1a73e8;
		border-radius: 50%;
	}

	.option-checkbox {
		width: 36rpx;
		height: 36rpx;
		border: 2rpx solid #ccc;
		border-radius: 4rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2rpx;
		transition: all 0.15s;

		.option-item--selected & {
			border-color: #1a73e8;
			background: #1a73e8;
		}
	}

	.checkbox-mark {
		color: #fff;
		font-size: 22rpx;
		font-weight: 700;
	}

	.option-text {
		color: #333;
		line-height: 1.6;
		word-break: break-all;
	}

	.unknown-type,
	.empty-question {
		text-align: center;
		padding: 60rpx;
		color: #999;
		font-size: 28rpx;
	}

	/* ---- 底部工具栏 ---- */
	.exam-toolbar {
	  display: flex;
	  justify-content: center;
	  padding: 20rpx 0 24rpx;
	  background: #fff;
	  border-top: 2rpx solid #e8e8e8;
	  flex-shrink: 0;
	}
	
	.toolbar-inner {
	  display: flex;
	  align-items: center;
	  gap: 10rpx;
	}
	
	.tool-btn {
	  display: inline-flex;
	  align-items: center;
	  gap: 14rpx;
	  padding: 32rpx 38rpx;
	  background: transparent;
	  border: 2rpx solid transparent;
	  border-radius: 10rpx;
	  cursor: pointer;
	  transition: all 0.15s;
	  color: #555;
	  white-space: nowrap;
	
	  &:hover {
	    background: #f0f4ff;
	    border-color: #d0d7ff;
	    color: #1a73e8;
	  }
	
	  &:disabled {
	    opacity: 0.3;
	    cursor: not-allowed;
	    &:hover {
	      background: transparent;
	      border-color: transparent;
	      color: #555;
	    }
	  }
	
	  &--mark {
	    color: #d69e2e;
	    &:hover:not(:disabled) {
	      background: #fffff0;
	      border-color: #ecc94b;
	      color: #b7791f;
	    }
	  }
	
	  &--unmark {
	    color: #888;
	    &:hover:not(:disabled) {
	      background: #f5f5f5;
	      border-color: #ddd;
	      color: #555;
	    }
	  }
	
	  &--submit {
	    color: #e53e3e;
	    &:hover:not(:disabled) {
	      background: #fff5f5;
	      border-color: #fed7d7;
	      color: #c53030;
	    }
	  }
	}
	
	.tool-icon {
	  font-size: 34rpx;
	  line-height: 1;
	}
	
	.tool-label {
	  font-size: 30rpx;
	  line-height: 1;
	  font-weight: 700;
	}
	
	.tool-divider {
	  width: 2rpx;
	  height: 40rpx;
	  background: #e0e0e0;
	  margin: 0 12rpx;
	}

	/* ---- 题卡弹出层 ---- */
.popup-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  width: 100%;
  max-height: 75vh;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  display: flex;
  flex-direction: column;
}

.popup-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}
.popup-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
}
.popup-close-btn {
  position: absolute;
  right: 30rpx;
  top: 50%;
  transform: translateY(-50%);
  padding: 12rpx 28rpx;
  font-size: 26rpx;
  color: #fff;
  background: #e53e3e;
  border: none;
  border-radius: 8rpx;
  cursor: pointer;
  font-weight: 500;
  &:hover {
    background: #c53030;
  }
}

.card-legend {
  display: flex;
  gap: 24rpx;
  padding: 20rpx 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #888;
}

.legend-box {
  width: 22rpx; height: 22rpx;
  border-radius: 4rpx;
  border: 1rpx solid #e0e0e0;

  &--answered { background: #e8f0fe; border-color: #a0c4ff; }
  &--marked { background: #fffbe6; border-color: #ecc94b; }
  &--unanswered { background: #fed7d7; border-color: #feb2b2; }
}

.card-grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20rpx 30rpx;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 10rpx;
}

.card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 6rpx;
  min-height: 56rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;

  &:hover {
    border-color: #1a73e8;
  }

  &--current {
    border-color: #1a73e8;
    background: #1a73e8;

    .card-btn-text { color: #fff; }
  }

  &--answered {
    background: #e8f0fe;
    border-color: #a0c4ff;

    .card-btn-text { color: #1a73e8; }
  }

  &--answered#{&}--current {
    background: #1a73e8;
    .card-btn-text { color: #fff; }
  }

  &--marked {
    background: #fffbe6;
    border-color: #ecc94b;

    .card-btn-text { color: #8b6914; }
  }

  &--marked#{&}--current {
    background: #d69e2e;
    border-color: #b7791f;
    .card-btn-text { color: #fff; }
  }

  &--unanswered {
    background: #fed7d7;
    border-color: #feb2b2;

    .card-btn-text { color: #c53030; }
  }

  &--unanswered#{&}--current {
    background: #1a73e8;
    border-color: #1a73e8;
    .card-btn-text { color: #fff; }
  }
}

.card-btn-text {
  font-size: 20rpx;
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
}
	
	
	
	/* ---- 弹窗（三级确认通用） ---- */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
	}

	.modal-content {
		width: 520rpx;
		background: #fff;
		border-radius: 16rpx;
		padding: 40rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
	}

	.modal-title {
		display: block;
		font-size: 32rpx;
		font-weight: 700;
		color: #333;
		margin-bottom: 24rpx;
		text-align: center;
	}

	.modal-body {
		margin-bottom: 30rpx;
	}

	.modal-text {
		display: block;
		font-size: 28rpx;
		color: #555;
		margin-bottom: 8rpx;
		line-height: 1.6;
	}

	.modal-actions {
		display: flex;
		gap: 20rpx;
		justify-content: center;

		.btn-default,
		.btn-primary,
		.btn-danger {
			flex: 1;
			height: 72rpx;
			font-size: 28rpx;
			border: none;
			border-radius: 8rpx;
			cursor: pointer;
			transition: background 0.2s;
		}

		.btn-default {
			color: #333;
			background: #fff;
			border: 1rpx solid #d9d9d9;

			&:hover {
				color: #1a73e8;
				border-color: #1a73e8;
			}
		}

		.btn-primary {
			color: #fff;
			background: #1a73e8;

			&:hover {
				background: #1557b0;
			}

			&:disabled {
				background: #a0c4ff;
				cursor: not-allowed;
			}
		}

		.btn-danger {
			color: #fff;
			background: #e53e3e;

			&:hover {
				background: #c53030;
			}

			&:disabled {
				background: #feb2b2;
				cursor: not-allowed;
			}
		}
	}

	/* ---- 加载遮罩 ---- */
	.loading-overlay {
		position: fixed;
		inset: 0;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 999;
	}

	.loading-spinner {
		width: 60rpx;
		height: 60rpx;
		border: 4rpx solid #e0e0e0;
		border-top-color: #1a73e8;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 20rpx;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		font-size: 28rpx;
		color: #888;
	}
	
	.stem-mark-icon {
	  font-size: inherit;
	}
</style>