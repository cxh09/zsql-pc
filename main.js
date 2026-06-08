const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')

let mainWindow = null
let childWindows = new Set()
let windowIdCounter = 0

// 获取主窗口
const getMainWindow = () => mainWindow

// 创建浏览器窗口的通用函数
const createBrowserWindow = (type = 'main', options = {}) => {
  const windowId = ++windowIdCounter
  const isMainWindow = type === 'main'

  const window = new BrowserWindow({
    width: options.width || 1200,
    height: options.height || 700,
    x: options.x,
    y: options.y,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#000000',
      height: 48
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      additionalArguments: [`--window-id=${windowId}`, `--window-type=${type}`]
    },
    ...options
  })

  // 存储窗口信息
  window.windowId = windowId
  window.windowType = type

  // 加载页面
  if (options.url) {
    // 子窗口加载独立标签页页面
    window.loadFile(path.join(__dirname, 'pages', 'tab-window.html'), {
      query: {
        url: options.url,
        title: options.title || '新窗口',
        icon: options.icon || 'home'
      }
    })
  } else {
    window.loadFile(path.join(__dirname, 'index.html'))
  }

  window.setMenu(null)

  // 窗口关闭处理
  window.on('closed', () => {
    if (isMainWindow) {
      mainWindow = null
      // 主窗口关闭时，关闭所有子窗口
      childWindows.forEach(child => {
        if (!child.isDestroyed()) {
          child.close()
        }
      })
      childWindows.clear()
    } else {
      childWindows.delete(window)
      // 通知主窗口子窗口已关闭
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('child-window-closed', windowId)
      }
    }
  })

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    window.webContents.openDevTools()
  }

  // 非主窗口添加到子窗口集合
  if (!isMainWindow) {
    childWindows.add(window)
  }

  return window
}

// 创建主窗口
const createWindow = () => {
  mainWindow = createBrowserWindow('main')

  // 只对本地 API 请求添加跨域头，不干扰外部网页
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isApiRequest = details.url.includes('/api/') || details.url.includes('localhost')
    if (isApiRequest) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
          'Access-Control-Allow-Headers': ['Content-Type, Authorization']
        }
      })
    } else {
      callback({ responseHeaders: details.responseHeaders })
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 拦截 webview 中 window.open() 新窗口请求，改为在新标签页打开
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      if (mainWindow) {
        mainWindow.webContents.send('open-new-tab', url)
      }
      return { action: 'deny' }
    })
  }
})

// IPC handlers for window controls
ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? win.isMaximized() : false
})

ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.minimize()
  }
})

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.close()
  }
})

ipcMain.handle('logout', () => {
  if (mainWindow) {
    mainWindow.webContents.send('logout-request')
  }
})

ipcMain.handle('set-theme', (_event, theme) => {
  if (mainWindow) {
    mainWindow.webContents.send('theme-change', theme)
  }
})

// 打开当前标签页的开发者工具
ipcMain.handle('open-devtools', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.webContents.openDevTools()
  }
})

// ========== 多窗口相关 IPC ==========

// 创建新窗口（从标签页分离）
ipcMain.handle('create-tab-window', (event, options) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  if (!senderWindow) return null

  // 获取原窗口位置，在新窗口偏移一点位置
  const bounds = senderWindow.getBounds()
  const newOptions = {
    ...options,
    x: bounds.x + 30,
    y: bounds.y + 30,
    width: bounds.width,
    height: bounds.height
  }

  const newWindow = createBrowserWindow('tab', newOptions)
  return newWindow.windowId
})

// 获取窗口信息
ipcMain.handle('get-window-info', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return null
  return {
    windowId: win.windowId,
    windowType: win.windowType
  }
})

// 向主窗口发送消息
ipcMain.handle('send-to-main', (event, channel, ...args) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 如果是合并标签页消息，先将主窗口带到最前面
    if (channel === 'merge-tab-back') {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
      mainWindow.moveTop()
    }
    mainWindow.webContents.send(channel, ...args)
  }
})

// 获取所有子窗口信息
ipcMain.handle('get-child-windows', () => {
  return Array.from(childWindows).map(win => ({
    windowId: win.windowId,
    title: win.getTitle()
  }))
})
