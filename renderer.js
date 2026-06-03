const { createApp, ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } = Vue

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

    // 监听 activeTab 变化，强制 webview 重绘
    // 解决 Electron webview 从 visibility/opacity 切换后内部页面不重新计算尺寸的问题
    watch(activeTab, () => {
      nextTick(() => {
        const webview = document.querySelector('webview.active')
        if (webview) {
          // 微调 flex 值触发 webview 重排
          webview.style.flex = '0.9999'
          requestAnimationFrame(() => {
            webview.style.flex = '1'
          })
        }
      })
    })

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
      attachWebviewListeners()
      return newTab.id
    }

    // 为 webview 绑定事件监听：更新标题和图标
    const attachWebviewListeners = () => {
      nextTick(() => {
        document.querySelectorAll('webview').forEach(webview => {
          if (webview._hasListeners) return
          webview._hasListeners = true

          // 获取 webview 在 DOM 中对应的 tab 索引
          const getTab = () => {
            const idx = Array.from(document.querySelectorAll('webview')).indexOf(webview)
            return idx >= 0 && idx < tabs.value.length ? tabs.value[idx] : null
          }

          // 页面标题更新时同步到标签
          webview.addEventListener('page-title-updated', (e) => {
            const tab = getTab()
            if (tab) tab.title = e.title
          })

          // 导航后更新标签 URL
          webview.addEventListener('did-navigate', (e) => {
            const tab = getTab()
            if (tab) tab.url = e.url
          })

          // SPA 等页面内导航也更新 URL
          webview.addEventListener('did-navigate-in-page', (e) => {
            if (e.isMainFrame) {
              const tab = getTab()
              if (tab) tab.url = e.url
            }
          })

          // 页面加载完成后获取 favicon
          webview.addEventListener('did-finish-load', () => {
            const tab = getTab()
            if (!tab) return
            try {
              webview.executeJavaScript(`
                (() => {
                  // 优先标准图标，避免匹配到 apple-touch-icon 等手机端图标
                  let link = document.querySelector('link[rel="icon"]') ||
                             document.querySelector('link[rel="shortcut icon"]') ||
                             document.querySelector('link[rel*="icon"]');
                  if (link) {
                    // 处理相对路径
                    if (link.href.startsWith('//')) {
                      return location.protocol + link.href;
                    } else if (link.href.startsWith('/')) {
                      return location.origin + link.href;
                    } else if (!link.href.startsWith('http')) {
                      return new URL(link.href, location.href).href;
                    }
                    return link.href;
                  }
                  // 兜底：域名下的 /favicon.ico
                  return location.origin + '/favicon.ico';
                })()
              `).then(iconUrl => {
                if (iconUrl) {
                  tab.icon = iconUrl
                }
              }).catch(() => {})
            } catch (e) {}
          })
        })
      })
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

    // ========== 浏览器对话框 ==========
    const browserDialog = reactive({
      visible: false,
      url: ''
    })

    // 检查当前是否有浏览器标签页处于激活状态
    const isBrowserTabActive = computed(() => {
      if (!activeTab.value) return false
      const tab = tabs.value.find(t => t.id === activeTab.value)
      return tab && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
    })

    const openBrowserDialog = () => {
      browserDialog.url = 'https://'
      browserDialog.visible = true
    }

    const confirmBrowserUrl = () => {
      const url = browserDialog.url.trim()
      if (!url || url === 'https://') {
        TDesign.MessagePlugin.warning('请输入网页地址')
        return
      }
      let finalUrl = url
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl
      }
      let title = '浏览器'
      try {
        const urlObj = new URL(finalUrl)
        title = urlObj.hostname
      } catch (e) {
        // 使用默认标题
      }
      browserDialog.visible = false
      openTab(title, finalUrl, 'home')
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
      showUserMenu.value = false
      clearCredentials()
      TDesign.MessagePlugin.info('已退出登录')
    }

    // ========== 用户菜单 ==========
    const showUserMenu = ref(false)

    const toggleUserMenu = () => {
      showUserMenu.value = !showUserMenu.value
    }

    const openAccountInfo = () => {
      showUserMenu.value = false
      openTab('账户信息', './pages/settings.html', 'settings')
      TDesign.MessagePlugin.info('账户信息页面')
    }

    const openUserSettings = () => {
      showUserMenu.value = false
      openTab('系统设置', './pages/settings.html', 'settings')
    }

    // 点击页面空白处关闭用户菜单
    const handleClickOutside = (e) => {
      if (showUserMenu.value) {
        const sidebar = document.querySelector('.sidebar')
        if (sidebar && !sidebar.contains(e.target)) {
          showUserMenu.value = false
        }
      }
    }

    // 挂载后监听点击外部事件
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    // 组件卸载时移除监听
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    // 暴露方法给子页面调用
    if (typeof window !== 'undefined') {
      window.electronAPI = window.electronAPI || {}
      window.electronAPI.openTab = openTab
    }

    // 监听来自主进程的打开新标签页请求（webview 中 window.open）
    if (window.electronAPI?.onOpenNewTab) {
      window.electronAPI.onOpenNewTab((url) => {
        let title = '浏览器'
        try {
          const urlObj = new URL(url)
          title = urlObj.hostname
        } catch (e) {
          // 使用默认标题
        }
        openTab(title, url, 'home')
      })
    }

    // 挂载后为已有 webview 绑定监听
    nextTick(attachWebviewListeners)

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
      isBrowserTabActive,
      browserDialog,
      openBrowserDialog,
      confirmBrowserUrl,
      refreshActiveTab,

      // 窗口控制
      minimizeWindow,
      maximizeWindow,
      closeWindow,

      // 用户菜单
      showUserMenu,
      toggleUserMenu,
      openAccountInfo,
      openUserSettings
    }
  }
}

const app = createApp(App)
app.use(TDesign)
app.mount('#app')
