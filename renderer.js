const { createApp, ref, reactive, computed } = Vue

const App = {
  setup() {
    // ========== 登录相关 ==========
    const isLoggedIn = ref(false)
    const loading = ref(false)
    const showQRCode = ref(false)
    const formData = reactive({
      username: '',
      password: '',
      remember: false
    })

    // 加载保存的账号信息
    const loadSavedCredentials = () => {
      const saved = localStorage.getItem('savedCredentials')
      if (saved) {
        try {
          const { username, password } = JSON.parse(saved)
          formData.username = username || ''
          formData.password = password || ''
          formData.remember = !!(username || password)
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    // 保存账号信息到 localStorage
    const saveCredentials = () => {
      if (formData.remember) {
        localStorage.setItem('savedCredentials', JSON.stringify({
          username: formData.username,
          password: formData.password
        }))
      } else {
        localStorage.removeItem('savedCredentials')
      }
    }

    // 清除保存的账号信息
    const clearCredentials = () => {
      localStorage.removeItem('savedCredentials')
    }

    // 初始化时加载保存的账号
    loadSavedCredentials()

    // ========== 标签页管理 ==========
    let tabIdCounter = 0
    const tabs = ref([])
    const activeTab = ref(null)

    // 生成唯一标签ID
    const generateTabId = () => `tab_${++tabIdCounter}`

    // 打开标签页
    const openTab = (title, url, icon = 'home') => {
      // 检查是否已存在相同URL的标签
      const existingTab = tabs.value.find(tab => tab.url === url)
      if (existingTab) {
        activeTab.value = existingTab.id
        return existingTab.id
      }

      // 创建新标签
      const newTab = {
        id: generateTabId(),
        title,
        url,
        icon
      }
      tabs.value.push(newTab)
      activeTab.value = newTab.id
      return newTab.id
    }

    // 切换标签
    const switchTab = (tabId) => {
      activeTab.value = tabId
    }

    // 关闭标签
    const closeTab = (tabId) => {
      const index = tabs.value.findIndex(tab => tab.id === tabId)
      if (index === -1) return

      tabs.value.splice(index, 1)

      // 如果关闭的是当前标签，切换到其他标签
      if (activeTab.value === tabId) {
        if (tabs.value.length > 0) {
          // 优先切换到右边的标签，否则切换到左边的
          const newIndex = Math.min(index, tabs.value.length - 1)
          activeTab.value = tabs.value[newIndex].id
        } else {
          activeTab.value = null
        }
      }
    }

    // 检查标签是否已打开
    const isTabOpen = (url) => {
      return tabs.value.some(tab => tab.url === url)
    }

    // 新建标签页（打开主页）
    const openNewTab = () => {
      openTab('主页', './pages/dashboard.html', 'home')
    }

    // 刷新当前标签
    const refreshActiveTab = () => {
      if (!activeTab.value) return
      const tab = tabs.value.find(t => t.id === activeTab.value)
      if (tab) {
        // 通过重新设置src来刷新webview
        const webview = document.querySelector(`webview[src="${tab.url}"]`)
        if (webview && webview.reload) {
          webview.reload()
        } else {
          // 备用方案：重新加载URL
          const originalUrl = tab.url
          tab.url = 'about:blank'
          setTimeout(() => {
            tab.url = originalUrl
          }, 10)
        }
      }
    }

    // ========== 窗口控制 ==========
    const minimizeWindow = () => {
      if (window.electronAPI?.minimize) {
        window.electronAPI.minimize()
      }
    }

    const maximizeWindow = () => {
      if (window.electronAPI?.maximize) {
        window.electronAPI.maximize()
      }
    }

    const closeWindow = () => {
      if (window.electronAPI?.close) {
        window.electronAPI.close()
      }
    }

    // ========== 登录处理 ==========
    const handleLogin = async () => {
      if (!formData.username || !formData.password) {
        TDesign.MessagePlugin.error('请输入用户名和密码')
        return
      }

      if (formData.username !== 'admin' || formData.password !== 'zsql1234') {
        TDesign.MessagePlugin.error('账号或密码错误')
        return
      }

      loading.value = true

      setTimeout(() => {
        loading.value = false
        isLoggedIn.value = true
        saveCredentials()
        TDesign.MessagePlugin.success('登录成功！')
        // 自动打开主页
        openTab('主页', './pages/dashboard.html', 'home')
      }, 1500)
    }

    const handleQRLogin = () => {
      showQRCode.value = !showQRCode.value
    }

    const handleLogout = () => {
      isLoggedIn.value = false
      tabs.value = []
      activeTab.value = null
      formData.username = ''
      formData.password = ''
      formData.remember = false
      clearCredentials()
      TDesign.MessagePlugin.info('已退出登录')
    }

    // 暴露方法给子页面调用
    if (typeof window !== 'undefined') {
      window.electronAPI = window.electronAPI || {}
      window.electronAPI.openTab = openTab
    }

    return {
      // 登录相关
      isLoggedIn,
      loading,
      showQRCode,
      formData,
      handleLogin,
      handleQRLogin,
      handleLogout,

      // 标签页管理
      tabs,
      activeTab,
      openTab,
      switchTab,
      closeTab,
      isTabOpen,
      openNewTab,
      refreshActiveTab,

      // 窗口控制
      minimizeWindow,
      maximizeWindow,
      closeWindow
    }
  }
}

const app = createApp(App)
app.use(TDesign)
app.mount('#app')
