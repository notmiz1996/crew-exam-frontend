<template>
  <view class="result-page">
    <!-- 加载中 -->
    <view class="loading-state" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在加载成绩...</text>
    </view>
    <!-- 成绩展示 -->
    <template v-else-if="hasResult">
      <view class="result-card card">
        <view class="result-icon">
          <text class="result-emoji">🎉</text>
        </view>
        <text class="result-title">考试完成</text>
        <view class="result-score-wrapper">
          <text class="result-score-label">您的得分</text>
          <text class="result-score">{{ totalScore }}</text>
          <text class="result-score-unit">分</text>
        </view>
        <view class="result-meta" v-if="submittedAt">
          <text class="meta-label">交卷时间</text>
          <text class="meta-value">{{ submittedAt }}</text>
        </view>
      </view>
      <view class="result-actions">
        <button class="btn-primary" @click="goHome">返回首页</button>
      </view>
    </template>
    <!-- 错误状态 -->
    <view class="error-state" v-else-if="errorMsg">
      <view class="result-card card">
        <view class="result-icon">
          <text class="result-emoji">😅</text>
        </view>
        <text class="error-title">{{ errorMsg }}</text>
        <text class="error-hint">请联系管理员确认考试状态</text>
      </view>
      <view class="result-actions">
        <button class="btn-primary" @click="goHome">返回首页</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { getResult } from '@/api/index'
const examId = ref(0)
const loading = ref(true)
const hasResult = ref(false)
const errorMsg = ref('')
const totalScore = ref(0)
const submittedAt = ref('')
onMounted(async () => {
  // 从路由参数获取 examId
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  if (page && page.options) {
    examId.value = parseInt(page.options.examId) || 0
  }
  if (!examId.value) {
    errorMsg.value = '参数错误'
    loading.value = false
    return
  }
  await loadResult()
})
async function loadResult() {
  loading.value = true
  try {
    const res = await getResult(examId.value)
    if (res.code === 0) {
      const data = res.data
      totalScore.value = data.total_score ?? 0
      hasResult.value = true
      // 格式化交卷时间
      if (data.submitted_at) {
        const d = new Date(data.submitted_at)
        const pad = (n) => String(n).padStart(2, '0')
        submittedAt.value =
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
          `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      }
    } else if (res.code === 1010) {
      // 考试尚未结束
      errorMsg.value = '考试尚未结束，无法查看成绩'
    } else {
      errorMsg.value = res.message || '加载成绩失败'
    }
  } catch (err) {
    errorMsg.value = '网络连接失败'
    console.error('[Result] 加载成绩失败:', err)
  } finally {
    loading.value = false
  }
}
function goHome() {
  uni.redirectTo({ url: '/pages/login/index' })
}
</script>
<style lang="scss" scoped>
.result-page {
  max-width: 520rpx;
  margin: 0 auto;
  padding: 60rpx 30rpx;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
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
  to { transform: rotate(360deg); }
}
.loading-text {
  font-size: 28rpx;
  color: #888;
}
/* 成绩卡片 */
.result-card {
  width: 100%;
  text-align: center;
  padding: 60rpx 40rpx;
  margin-bottom: 40rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
.result-icon {
  margin-bottom: 20rpx;
}
.result-emoji {
  font-size: 80rpx;
}
.result-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 40rpx;
}
.result-score-wrapper {
  margin-bottom: 30rpx;
}
.result-score-label {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-bottom: 12rpx;
}
.result-score {
  font-size: 80rpx;
  font-weight: 800;
  color: #1a73e8;
  line-height: 1;
}
.result-score-unit {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-top: 8rpx;
}
.result-meta {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  font-size: 24rpx;
}
.meta-label {
  color: #999;
}
.meta-value {
  color: #666;
}
/* 错误状态 */
.error-state {
  width: 100%;
}
.error-title {
  display: block;
  font-size: 30rpx;
  color: #e53e3e;
  margin-bottom: 12rpx;
}
.error-hint {
  display: block;
  font-size: 26rpx;
  color: #999;
}
/* 操作按钮 */
.result-actions {
  width: 100%;
  .btn-primary {
    width: 100%;
    height: 88rpx;
    font-size: 32rpx;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #1a73e8;
    border: none;
    border-radius: 8rpx;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: #1557b0;
    }
  }
}
</style>