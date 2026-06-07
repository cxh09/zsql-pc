const { contextBridge, ipcRenderer } = require('electron')

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

  // 监听主窗口消息
  onMainMessage: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },

  // 移除事件监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
