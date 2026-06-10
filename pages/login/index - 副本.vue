<template>
  <view class="login-page">
    <!-- 标题区 -->
    <view class="login-header">
      <text class="login-title">肇庆市船员履职技能大赛</text>
      <text class="login-subtitle">机考系统</text>
    </view>
    <!-- 考试选择区 -->
    <view class="login-section card">
      <text class="section-title">选择考试</text>
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
        <view
          v-for="exam in examList"
          :key="exam.id"
          class="exam-item"
          :class="{ 'exam-item--selected': selectedExamId === exam.id }"
          @click="selectedExamId = exam.id"
        >
          <view class="exam-info">
            <text class="exam-name">{{ exam.name }}</text>
            <text class="exam-time">
              {{ formatTime(exam.start_time) }} ~ {{ formatTime(exam.end_time) }}
            </text>
            <text class="exam-duration">时长：{{ exam.duration_minutes }} 分钟</text>
          </view>
          <text class="exam-check" v-if="selectedExamId === exam.id">✓</text>
        </view>
      </view>
    </view>
    <!-- 登录表单 -->
    <view class="login-section card">
      <text class="section-title">考生信息</text>
      <view class="form-group">
        <text class="form-label">身份证号</text>
        <input
          class="form-input"
          type="text"
          v-model="idCard"
          placeholder="请输入18位身份证号"
          maxlength="18"
          @input="onIdCardInput"
        />
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
      <button
        class="btn-primary login-btn"
        :disabled="!canLogin || logining"
        @click="handleLogin"
      >
        {{ logining ? '登录中...' : '进入考试' }}
      </button>
    </view>
  </view>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getExamList, login } from '@/api/index'
import { saveLoginInfo } from '@/utils/storage'
// ==================== 状态 ====================
const examList = ref([])
const selectedExamId = ref(null)
const idCard = ref('')
const errorMsg = ref('')
const loading = ref(true)
const logining = ref(false)
// ==================== 计算属性 ====================
/** 身份证号是否有效（18位 + 基本格式校验） */
const isIdCardValid = computed(() => {
  return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard.value)
})
/** 是否可以登录 */
const canLogin = computed(() => {
  return selectedExamId.value !== null && isIdCardValid.value && !logining.value
})
// ==================== 生命周期 ====================
onMounted(() => {
  loadExamList()
})
// ==================== 方法 ====================
/** 加载考试列表 */
async function loadExamList() {
  loading.value = true
  try {
    const res = await getExamList()
    if (res.code === 0) {
      examList.value = res.data || []
      // 默认选中第一个
      if (examList.value.length > 0) {
        selectedExamId.value = examList.value[0].id
      }
    } else {
      errorMsg.value = res.message || '加载考试列表失败'
    }
  } catch (err) {
    errorMsg.value = '网络连接失败，请检查网络'
    console.error('[Login] 加载考试列表失败:', err)
  } finally {
    loading.value = false
  }
}
/** 身份证号输入时，自动转大写 X */
function onIdCardInput() {
  idCard.value = idCard.value.toUpperCase()
  // 清除旧错误
  if (errorMsg.value) errorMsg.value = ''
}
/** 登录 */
async function handleLogin() {
  if (!canLogin.value) return
  logining.value = true
  errorMsg.value = ''
  try {
    const examId = selectedExamId.value
    const res = await login(examId, idCard.value)
	console.log(res);
    if (res.code === 0) {
      const data = res.data
	  
      // 保存登录信息
      saveLoginInfo(data, idCard.value)
      // 根据 paper_status 跳转
      const status = data.paper_status
      if (status === 'finished') {
        // 已交卷 → 成绩页
        uni.redirectTo({ url: `/pages/result/index?examId=${examId}` })
      } else {
        // pending 或 in_progress → 考试页
        uni.redirectTo({ url: `/pages/exam/index?examId=${examId}` })
      }
    } else {
      // 映射后端错误码到友好提示
      const errorMap = {
        1001: '该身份证号未在本场考试考生名单中，请联系管理员',
        1002: '本场考试已结束',
        1003: '本场考试尚未开始',
        1005: '登录信息异常，请重新尝试',
      }
      errorMsg.value = errorMap[res.code] || res.message || '登录失败'
    }
  } catch (err) {
    errorMsg.value = '网络连接失败，请检查网络后重试'
    console.error('[Login] 登录失败:', err)
  } finally {
    logining.value = false
  }
}
/** 格式化时间 */
function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日
  ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  </script>
  <style lang="scss" scoped>
  /* ========== 登录页布局 ========== */
  .login-page {
    max-width: 640rpx;
    margin: 0 auto;
    padding: 40rpx 30rpx;
    min-height: 100vh;
    box-sizing: border-box;
  }
  /* 标题区 */
  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40rpx;
  }
  .login-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1a73e8;
    margin-bottom: 8rpx;
  }
  .login-subtitle {
    font-size: 28rpx;
    color: #666;
  }
  /* 区块通用 */
  .login-section {
    margin-bottom: 30rpx;
  }
  .section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 2rpx solid #f0f0f0;
  }
  /* 考试列表 */
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
  /* 加载状态 */
  .loading-text {
    text-align: center;
    padding: 40rpx;
    color: #999;
    font-size: 26rpx;
  }
  /* 空状态 */
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
  /* 表单 */
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
  /* 错误提示 */
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
  /* 登录按钮 */
  .login-btn {
    width: 100%;
    height: 88rpx;
    font-size: 32rpx;
    margin-top: 10rpx;
  }
  </style>