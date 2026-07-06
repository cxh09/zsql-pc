const { contextBridge, ipcRenderer } = require('electron')

// 同步常量,与 src/composables/pageRegistry.ts 中的 PAGE_REGISTRY 保持一致
// (preload 在 Node 上下文加载,无法直接 require .ts 模块,故内联精简子集)
const PAGE_META = {
  dashboard:           { title: '主页',         url: './pages/dashboard.html',         icon: 'home' },
  applications:        { title: '预约查看',     url: './pages/applications.html',      icon: 'file' },
  applicationDetail:   { title: '预约详情',     url: './pages/application-detail.html',icon: 'doc' },
  customerService:     { title: '客户会话',     url: 'https://chatbot.weixin.qq.com/@ideaaaf6b/platform/statistic/customerService', icon: 'message' },
  browser:             { title: '浏览器',       url: './pages/browser.html',           icon: 'browser' },
  navigation:          { title: '路线规划',     url: './pages/navigation.html',        icon: 'navigation' },
  videoTransmission:   { title: '数字图传',     url: './pages/video-transmission.html',icon: 'webcam' },
  account:             { title: '账户信息',     url: './pages/account.html',           icon: 'user' },
  settings:            { title: '系统设置',     url: './pages/settings.html',          icon: 'settings' },
  changelog:           { title: '更新日志',     url: './pages/changelog.html',         icon: 'file' },
  networkDiagnosis:    { title: '网络质量监测', url: './pages/network-diagnosis.html', icon: 'network' },
  agreement:           { title: '用户协议',     url: './pages/agreement.html?tab=agreement', icon: 'doc' },
  privacy:             { title: '隐私政策',     url: './pages/agreement.html?tab=privacy',   icon: 'doc' }
}

const ICON_FILES = {
  home: 'icon-home.svg',
  file: 'icon-file.svg',
  settings: 'icon-settings.svg',
  message: 'icon-message.svg',
  browser: 'icon-browser.svg',
  user: 'icon-user.svg',
  doc: 'icon-doc.svg',
  navigation: 'icon-navigation.svg',
  network: 'icon-network.svg',
  globe: 'icon-globe.svg',
  webcam: 'icon-webcam.svg'
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  maximize: () => ipcRenderer.invoke('window-maximize'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // 标签页相关
  onOpenNewTab: (callback) => {
    ipcRenderer.on('open-new-tab', (_event, url) => callback(url))
  },

  // 登录相关
  logout: () => ipcRenderer.invoke('logout'),
  onLogout: (callback) => {
    ipcRenderer.on('logout-request', () => callback())
  },

  // 主题相关
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-change', (_event, theme) => callback(theme))
  },

  // 开发者工具
  openDevTools: () => ipcRenderer.invoke('open-devtools'),

  // ========== 多窗口相关 API ==========

  // 创建新窗口（从标签页分离）
  createTabWindow: (options) => ipcRenderer.invoke('create-tab-window', options),

  // 获取当前窗口信息
  getWindowInfo: () => ipcRenderer.invoke('get-window-info'),

  // 向主窗口发送消息
  sendToMain: (channel, ...args) => ipcRenderer.invoke('send-to-main', channel, ...args),

  // 获取所有子窗口信息
  getChildWindows: () => ipcRenderer.invoke('get-child-windows'),

  // 监听子窗口关闭事件
  onChildWindowClosed: (callback) => {
    ipcRenderer.on('child-window-closed', (_event, windowId) => callback(windowId))
  },

  // 获取 app 根目录（用于 webview 以 file:// 加载本地 pages/*.html）
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // 打开新标签页(主进程转发到主窗口 useTabs.openTab)
  openTab: (options) => ipcRenderer.invoke('open-tab-request', options),

  // 同步:获取本地图标资源路径(主窗口用 /pages/,tab-window 用 ../pages/)
  getIconPath: (name) => `/pages/${ICON_FILES[name] || ICON_FILES.globe}`,

  // 同步:按 pageKey 解析页面元数据
  resolvePage: (pageKey) => PAGE_META[pageKey] || null,

  // 监听主窗口消息
  onMainMessage: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },

  // 监听全局搜索切换事件（来自主进程菜单 accelerator）
  onToggleSearch: (callback) => {
    ipcRenderer.on('toggle-search', () => callback())
  },

  // 通知主进程:全局搜索浮层是否打开(用于 ESC 关闭逻辑)
  setSearchState: (isOpen) => ipcRenderer.send('set-search-state', !!isOpen),

  // 移除事件监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
