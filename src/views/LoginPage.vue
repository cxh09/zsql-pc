<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useWindowInfo } from '../composables/useWindowInfo'
import { useTabs } from '../composables/useTabs'

const { isLoggedIn } = useWindowInfo()
const { openTab } = useTabs()

const loading = ref(false)
const showQRCode = ref(false)
const formData = reactive({
  username: '',
  password: '',
  remember: false
})

function loadSavedCredentials() {
  try {
    const saved = localStorage.getItem('savedCredentials')
    if (saved) {
      const { username, password } = JSON.parse(saved)
      formData.username = username || ''
      formData.password = password || ''
      formData.remember = !!(username || password)
    }
  } catch {
    /* ignore */
  }
}

function saveCredentials() {
  if (formData.remember) {
    localStorage.setItem('savedCredentials', JSON.stringify({
      username: formData.username,
      password: formData.password
    }))
  } else {
    localStorage.removeItem('savedCredentials')
  }
}

function handleLogin() {
  if (!formData.username || !formData.password) {
    MessagePlugin.error('请输入用户名和密码')
    return
  }
  if (formData.username !== 'admin' || formData.password !== 'zsql1234') {
    MessagePlugin.error('账号或密码错误')
    return
  }
  loading.value = true
  setTimeout(() => {
    loading.value = false
    isLoggedIn.value = true
    saveCredentials()
    MessagePlugin.success('登录成功！')
    openTab('主页', './pages/dashboard.html', 'home', 'dashboard')
  }, 1500)
}

function handleQRLogin() {
  showQRCode.value = !showQRCode.value
}

onMounted(loadSavedCredentials)
</script>

<template>
  <div class="login-page">
    <img src="/assets/bgpic.png" alt="banner" class="bg-image" onerror="this.style.display='none'">
    <div class="brand-section"></div>

    <div class="login-section">
      <div class="login-card">
        <div v-if="showQRCode" class="qr-login-section">
          <div class="login-header">
            <h1>扫码登录</h1>
            <p>请使用App扫一扫登录</p>
          </div>
          <div class="qr-code-box-large">
            <svg width="200" height="200" viewBox="0 0 120 120">
              <rect x="5" y="5" width="40" height="40" fill="none" stroke="#1f2937" stroke-width="4"/>
              <rect x="75" y="5" width="40" height="40" fill="none" stroke="#1f2937" stroke-width="4"/>
              <rect x="5" y="75" width="40" height="40" fill="none" stroke="#1f2937" stroke-width="4"/>
              <rect x="12" y="12" width="26" height="26" fill="#1f2937"/>
              <rect x="82" y="12" width="26" height="26" fill="#1f2937"/>
              <rect x="12" y="82" width="26" height="26" fill="#1f2937"/>
              <rect x="19" y="19" width="12" height="12" fill="white"/>
              <rect x="89" y="19" width="12" height="12" fill="white"/>
              <rect x="19" y="89" width="12" height="12" fill="white"/>
              <rect x="55" y="10" width="8" height="8" fill="#1f2937"/>
              <rect x="55" y="25" width="8" height="8" fill="#1f2937"/>
              <rect x="55" y="40" width="8" height="8" fill="#1f2937"/>
              <rect x="10" y="55" width="8" height="8" fill="#1f2937"/>
              <rect x="25" y="55" width="8" height="8" fill="#1f2937"/>
              <rect x="40" y="55" width="8" height="8" fill="#1f2937"/>
              <rect x="55" y="55" width="50" height="50" fill="#1f2937"/>
              <rect x="60" y="60" width="40" height="40" fill="white"/>
              <rect x="70" y="70" width="20" height="20" fill="#1f2937"/>
            </svg>
          </div>
          <div class="switch-login-type">
            <t-link theme="primary" @click="handleQRLogin">使用账号密码登录</t-link>
          </div>
        </div>

        <div v-else class="account-login-section">
          <div class="login-header">
            <h1>欢迎使用</h1>
            <p>请登录您的账户以继续</p>
          </div>
          <div class="login-form">
            <t-input
              v-model="formData.username"
              placeholder="请输入用户名/邮箱"
              size="large"
              clearable
            >
              <template #prefix-icon>
                <t-icon name="user" />
              </template>
            </t-input>
            <t-input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              clearable
            >
              <template #prefix-icon>
                <t-icon name="lock-on" />
              </template>
            </t-input>
            <div class="form-options">
              <t-checkbox v-model="formData.remember">记住我</t-checkbox>
              <t-link theme="primary" hover="color">忘记密码?</t-link>
            </div>
            <t-button
              theme="primary"
              size="large"
              block
              :loading="loading"
              @click="handleLogin"
              class="login-button"
            >
              登录
            </t-button>
          </div>
          <div class="divider"><span>或使用以下方式登录</span></div>
          <t-button theme="default" variant="outline" size="large" block @click="handleQRLogin">
            <template #icon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </template>
            扫码登录
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>
