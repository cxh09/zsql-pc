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

    // 监听 activeTab 变化，强制 webview 重绘，并滚动标签到可视区域
    // 解决 Electron webview 从 visibility/opacity 切换后内部页面不重新计算尺寸的问题
    watch(activeTab, () => {
      nextTick(() => {
        // 滚动标签到可视区域
        const activeTabEl = document.querySelector('.browser-tab.active')
        if (activeTabEl) {
          const container = activeTabEl.closest('.browser-tabs')
          if (container) {
            const containerRect = container.getBoundingClientRect()
            const tabRect = activeTabEl.getBoundingClientRect()
            if (tabRect.right > containerRect.right) {
              container.scrollLeft += tabRect.right - containerRect.right + 4
            } else if (tabRect.left < containerRect.left) {
              container.scrollLeft -= containerRect.left - tabRect.left + 4
            }
          }
        }

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
    const openTab = (title, url, icon = 'home', pageKey) => {
      // 关闭菜单
      showMenu.value = false

      // 创建新标签
      const newTab = {
        id: generateTabId(),
        title,
        url,
        icon,
        ...(pageKey && { pageKey })
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

    // 检查标签是否已打开（支持 pageKey 或 URL 匹配）
    const isTabOpen = (url, pageKey) => {
      return tabs.value.some(tab => pageKey ? tab.pageKey === pageKey : tab.url === url)
    }

    // ========== 浏览器对话框 ==========
    const browserDialog = reactive({
      visible: false,
      url: ''
    })

    // ========== 浏览器URL输入 ==========
    const browserInputUrl = ref('https://')
    const browserSuggestions = ref([])
    const showBrowserSuggestions = ref(false)

    // 检查是否是浏览器输入页面
    const isBrowserInputPage = computed(() => {
      if (!activeTab.value) return false
      const tab = tabs.value.find(t => t.id === activeTab.value)
      return tab && tab.url === 'browser://input'
    })

    // 监听输入变化，更新搜索建议
    watch(browserInputUrl, (newVal) => {
      const input = newVal.trim()
      if (!input || input === 'https://') {
        browserSuggestions.value = []
        showBrowserSuggestions.value = false
        return
      }
      
      // 去掉 https:// 前缀进行判断
      const cleanInput = input.replace(/^https?:\/\//, '')
      
      const suggestions = []
      const isUrl = isValidUrl(cleanInput)
      
      if (isUrl) {
        // 是网址，提供访问选项
        let url = cleanInput
        if (!/^https?:\/\//i.test(input)) {
          url = 'https://' + cleanInput
        }
        suggestions.push({
          type: 'visit',
          title: `访问 ${cleanInput}`,
          url: url,
          icon: 'globe'
        })
      }
      
      // 始终提供搜索选项
      suggestions.push({
        type: 'search',
        title: `搜索 "${cleanInput}"`,
        url: 'https://www.bing.com/search?q=' + encodeURIComponent(cleanInput),
        icon: 'search'
      })
      
      browserSuggestions.value = suggestions
      showBrowserSuggestions.value = suggestions.length > 0
    })

    // 检查当前是否有浏览器标签页处于激活状态
    const isBrowserTabActive = computed(() => {
      if (!activeTab.value) return false
      const tab = tabs.value.find(t => t.id === activeTab.value)
      return tab && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
    })

    // 打开浏览器输入页面
    const openBrowserDialog = () => {
      showMenu.value = false
      browserInputUrl.value = 'https://'
      openTab('浏览器', 'browser://input', 'home')
    }

    // 判断是否为有效网址
    const isValidUrl = (str) => {
      // 检查是否以 http:// 或 https:// 开头
      if (/^https?:\/\//i.test(str)) {
        try {
          new URL(str)
          return true
        } catch (e) {
          return false
        }
      }
      // 检查是否为有效域名（如 baidu.com, www.baidu.com 等）
      const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
      if (domainPattern.test(str.trim())) {
        return true
      }
      // 检查是否为 IP 地址（如 127.0.0.1）
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
      if (ipPattern.test(str.trim())) {
        const parts = str.trim().split('.')
        return parts.every(part => parseInt(part) <= 255)
      }
      return false
    }

    // 确认浏览器URL并加载
    const confirmBrowserUrl = (targetUrl) => {
      const url = targetUrl || browserInputUrl.value.trim()
      if (!url || url === 'https://') {
        TDesign.MessagePlugin.warning('请输入网页地址')
        return
      }
      
      let finalUrl = url
      let title = '浏览器'
      try {
        const urlObj = new URL(finalUrl)
        title = urlObj.hostname
      } catch (e) {
        // 使用默认标题
      }
      
      // 隐藏建议列表
      showBrowserSuggestions.value = false
      
      // 更新当前tab的URL
      const currentTabId = activeTab.value
      const tab = tabs.value.find(t => t.id === currentTabId)
      if (tab) {
        tab.url = finalUrl
        tab.title = title
        // 重新加载webview
        nextTick(() => {
          const webview = document.querySelector('.page-webview.active')
          if (webview) {
            webview.loadURL(finalUrl)
          }
        })
      }
    }

    // 选择建议项
    const selectBrowserSuggestion = (suggestion) => {
      browserInputUrl.value = suggestion.url
      confirmBrowserUrl(suggestion.url)
    }

    // 旧版本兼容 - 保留原函数
    const confirmBrowserUrlOld = () => {
      const url = browserDialog.url.trim()
      if (!url || url === 'https://') {
        TDesign.MessagePlugin.warning('请输入网页地址')
        return
      }
      let finalUrl
      // 判断是否为网址
      if (isValidUrl(url)) {
        // 是网址，直接访问
        finalUrl = url
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl
        }
      } else {
        // 不是网址，使用必应搜索
        finalUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(url)
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
      TDesign.DialogPlugin.confirm({
        header: '确认退出账号',
        body: '退出账号后将清除当前登录状态，是否继续？',
        onConfirm: () => {
          isLoggedIn.value = false
          tabs.value = []
          activeTab.value = null
          formData.username = ''
          formData.password = ''
          formData.remember = false
          showUserMenu.value = false
          showMenu.value = false
          clearCredentials()
          TDesign.MessagePlugin.info('已退出登录')
        }
      })
    }

    // ========== 菜单 ==========
    const showMenu = ref(false)

    const toggleMenu = () => {
      showMenu.value = !showMenu.value
    }

    // ========== 客户会话二级菜单 ==========
    const showCustomerSubmenu = ref(false)
    const showQRCodeDialog = ref(false)
    let customerSubmenuTimer = null

    const showCustomerSubmenuDelayed = () => {
      if (customerSubmenuTimer) {
        clearTimeout(customerSubmenuTimer)
        customerSubmenuTimer = null
      }
      showCustomerSubmenu.value = true
    }

    const hideCustomerSubmenuDelayed = () => {
      customerSubmenuTimer = setTimeout(() => {
        showCustomerSubmenu.value = false
      }, 200)
    }

    const openMiniProgramQRCode = () => {
      showQRCodeDialog.value = true
      showCustomerSubmenu.value = false
      if (customerSubmenuTimer) {
        clearTimeout(customerSubmenuTimer)
        customerSubmenuTimer = null
      }
    }

    // ========== 用户菜单 ==========
    const showUserMenu = ref(false)

    const toggleUserMenu = () => {
      showUserMenu.value = !showUserMenu.value
    }

    const openAccountInfo = () => {
      showUserMenu.value = false
      showMenu.value = false
      openTab('账户信息', './pages/settings.html', 'settings', 'settings')
      TDesign.MessagePlugin.info('账户信息页面')
    }

    const openUserSettings = () => {
      showUserMenu.value = false
      showMenu.value = false
      openTab('系统设置', './pages/settings.html', 'settings', 'settings')
    }

    // 点击页面空白处关闭菜单
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('.sidebar')
      if (sidebar && !sidebar.contains(e.target)) {
        showUserMenu.value = false
        showMenu.value = false
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
      isBrowserInputPage,
      browserDialog,
      browserInputUrl,
      browserSuggestions,
      showBrowserSuggestions,
      openBrowserDialog,
      confirmBrowserUrl,
      selectBrowserSuggestion,
      refreshActiveTab,

      // 窗口控制
      minimizeWindow,
      maximizeWindow,
      closeWindow,

      // 菜单
      showMenu,
      toggleMenu,

      // 用户菜单
      showUserMenu,
      toggleUserMenu,
      openAccountInfo,
      openUserSettings,

      // 客户会话
      showCustomerSubmenu,
      showQRCodeDialog,
      openMiniProgramQRCode,
      showCustomerSubmenuDelayed,
      hideCustomerSubmenuDelayed
    }
  }
}

const app = createApp(App)
app.use(TDesign)
app.config.compilerOptions.isCustomElement = (tag) => tag === 'webview'
app.mount('#app')
