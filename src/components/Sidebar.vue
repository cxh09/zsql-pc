<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { DialogPlugin } from 'tdesign-vue-next'
import { useTabs } from '../composables/useTabs'
import { getElectronAPI } from '../composables/useElectron'

const { openTab, isTabOpen, clearAllTabs, wireGlobalListeners } = useTabs()
wireGlobalListeners()

const showMenu = ref(false)
const showUserMenu = ref(false)
const showCustomerSubmenu = ref(false)
const showQRCodeDialog = ref(false)
let customerSubmenuTimer: ReturnType<typeof setTimeout> | null = null

function showSubmenuDelayed() {
  if (customerSubmenuTimer) {
    clearTimeout(customerSubmenuTimer)
    customerSubmenuTimer = null
  }
  showCustomerSubmenu.value = true
}
function hideSubmenuDelayed() {
  customerSubmenuTimer = setTimeout(() => {
    showCustomerSubmenu.value = false
  }, 200)
}
function openMiniProgramQRCode() {
  showQRCodeDialog.value = true
  showCustomerSubmenu.value = false
  if (customerSubmenuTimer) {
    clearTimeout(customerSubmenuTimer)
    customerSubmenuTimer = null
  }
}

function handleLogout() {
  const dlg = DialogPlugin.confirm({
    header: '确认退出账号',
    body: '退出账号后将清除当前登录状态，是否继续？',
    onConfirm: () => {
      dlg.destroy()
      clearAllTabs()
      showUserMenu.value = false
      showMenu.value = false
      getElectronAPI()?.logout()
    },
    onCancel: () => dlg.destroy()
  })
}

function openAccountInfo() {
  showUserMenu.value = false
  showMenu.value = false
  openTab('账户信息', './pages/account.html', undefined, 'account')
}
function openSettings() {
  showUserMenu.value = false
  showMenu.value = false
  openTab('系统设置', './pages/settings.html', undefined, 'settings')
}
function openChangelog() {
  showUserMenu.value = false
  showMenu.value = false
  openTab('更新日志', './pages/changelog.html', undefined, 'changelog')
}
function openDevTools() {
  showUserMenu.value = false
  showMenu.value = false
  const wv = document.querySelector('webview.active') as
    | (HTMLElement & { openDevTools?: () => void })
    | null
  if (wv?.openDevTools) wv.openDevTools()
  else getElectronAPI()?.openDevTools()
}
function openNetworkDiagnosis() {
  showUserMenu.value = false
  showMenu.value = false
  openTab('网络质量监测', './pages/network-diagnosis.html', undefined, 'networkDiagnosis')
}

onUnmounted(() => {
  if (customerSubmenuTimer) clearTimeout(customerSubmenuTimer)
})
</script>

<template>
  <aside class="sidebar">
    <div
      class="sidebar-item"
      :class="{ active: isTabOpen(null, 'dashboard') }"
      @click="openTab('主页', './pages/dashboard.html', undefined, 'dashboard')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      <span>主页</span>
    </div>
    <div
      class="sidebar-item"
      :class="{ active: isTabOpen(null, 'applications') }"
      @click="openTab('预约查看', './pages/applications.html', undefined, 'applications')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6"/><path d="M4 2h10"/><rect x="4" y="18" width="16" height="4" rx="1"/><rect x="4" y="6" width="16" height="4" rx="1"/></svg>
      <span>预约</span>
    </div>
    <div
      class="sidebar-item has-submenu"
      :class="{ active: isTabOpen(null, 'customerService'), 'submenu-open': showCustomerSubmenu }"
      @mouseenter="showSubmenuDelayed"
      @mouseleave="hideSubmenuDelayed"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/></svg>
      <span>客户会话</span>
      <div
        class="submenu"
        v-show="showCustomerSubmenu"
        @mouseenter="showSubmenuDelayed"
        @mouseleave="hideSubmenuDelayed"
      >
        <div class="submenu-item" @click="openMiniProgramQRCode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22Z" fill="transparent"/><path d="M12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="square"/><path d="M9 12.05C7.85888 12.2816 7 13.2905 7 14.5C7 15.8807 8.11929 17 9.5 17C10.8807 17 12 15.8807 12 14.5V9.5C12 8.11929 13.1193 7 14.5 7C15.8807 7 17 8.11929 17 9.5C17 10.7095 16.1411 11.7184 15 11.95" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></g></svg>
          <span>访问小程序版本</span>
        </div>
        <div class="submenu-item" @click="openTab('客户会话', 'https://chatbot.weixin.qq.com/@ideaaaf6b/platform/statistic/customerService', undefined, 'customerService')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g><ellipse cx="12.0013" cy="12.0007" rx="4.00125" ry="4.00075" fill="transparent"/><path d="M22.0034 12.002C22.0034 17.5248 17.5263 22.002 12.0034 22.002C6.48057 22.002 2.00342 17.5248 2.00342 12.002C2.00342 6.4791 6.48057 2.00195 12.0034 2.00195C17.5263 2.00195 22.0034 6.4791 22.0034 12.002Z" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></g></svg>
          <span>使用网页版</span>
        </div>
      </div>
    </div>
    <div
      class="sidebar-item"
      :class="{ active: isTabOpen(null, 'videoTransmission') }"
      @click="openTab('数字图传', './pages/video-transmission.html', undefined, 'videoTransmission')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="8"/><circle cx="12" cy="10" r="3"/><path d="M7 22h10"/><path d="M12 22v-4"/></svg>
      <span>数字图传</span>
    </div>
    <div
      class="sidebar-item"
      :class="{ active: isTabOpen(null, 'browser') }"
      @click="openTab('浏览器', './pages/browser.html', 'browser', 'browser')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></svg>
      <span>浏览器</span>
    </div>

    <div class="sidebar-bottom">
      <div class="sidebar-item" @click="showMenu = !showMenu">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
      </div>

      <div class="menu-dropdown" :class="{ open: showMenu }" @click.stop>
        <div class="menu-dropdown-item" @click="openAccountInfo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>管理员</span>
        </div>
        <div class="menu-dropdown-item" @click="openSettings"><span>系统设置</span></div>
        <div class="menu-dropdown-item" @click="openChangelog"><span>更新日志</span></div>
        <div class="menu-dropdown-item" @click="openDevTools"><span>开发人员工具</span></div>
        <div class="menu-dropdown-item" @click="openNetworkDiagnosis"><span>网络质量监测</span></div>
        <div class="menu-dropdown-divider"></div>
        <div class="menu-dropdown-item danger" @click="handleLogout"><span>退出账号</span></div>
      </div>
    </div>
  </aside>

  <t-dialog
    v-model:visible="showQRCodeDialog"
    header="访问小程序版本"
    :confirm-btn="null"
    cancel-btn="关闭"
    width="360px"
  >
    <div style="text-align: center; padding: 20px;">
      <img src="/assets/external/wechat-qrcode.jpg" alt="小程序二维码" style="width: 200px; height: 200px; border-radius: 8px;" />
      <p style="margin-top: 16px; color: #666; font-size: 14px;">微信扫码访问小程序版本</p>
    </div>
  </t-dialog>
</template>
