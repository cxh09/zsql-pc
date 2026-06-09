const { app, BrowserWindow, ipcMain, session, Menu } = require('electron')
const path = require('path')

// Vite dev server URL is injected by the dev script (cross-env VITE_DEV_SERVER_URL=...).
// In production, this env var is undefined and we fall back to the bundled renderer.
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

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
  } else if (VITE_DEV_SERVER_URL) {
    // 开发模式：加载 Vite dev server 以获得 HMR。
    window.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // 生产模式：加载 Vite 打包后的 index.html（dist/renderer/index.html）。
    window.loadFile(path.join(__dirname, 'dist', 'renderer', 'index.html'))
  }

  // 不移除菜单（这样 Menu 的 accelerator 才能在 webview 获得焦点时仍然生效），
  // 仅隐藏菜单栏显示。Ctrl+K 等全局快捷键通过 application menu 的 accelerator 触发。
  window.setMenuBarVisibility(false)

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

// ========== 应用菜单（含全局快捷键） ==========
// Electron 的菜单 accelerator 即使 webview 拥有焦点也能触发，
// 这是解决 "Ctrl+K 在 webview 焦点下不响应" 的关键。
const buildAppMenu = () => {
  const isMac = process.platform === 'darwin'
  const template = [
    // macOS 必须有应用菜单
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: '全局搜索',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            // 向主窗口发送 toggle-search 事件
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('toggle-search')
            }
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  buildAppMenu()
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

// 返回 app 根目录（用于 webview 子页面以 file:// 加载）
ipcMain.handle('get-app-path', () => {
  return app.getAppPath()
})
