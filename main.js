const { app, BrowserWindow, ipcMain, session, Menu } = require('electron')
const path = require('path')
const net = require('net')
const videoService = require('./video-transmission-service')

// Vite dev server URL is injected by the dev script (cross-env VITE_DEV_SERVER_URL=...).
// In production, this env var is undefined and we fall back to the bundled renderer.
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow = null
let childWindows = new Set()
let windowIdCounter = 0
// 主窗口"全局搜索"浮层是否打开;true 时不响应 ESC 关闭,让渲染层先关搜索
let searchOpenInMain = false

// 获取主窗口
const getMainWindow = () => mainWindow

// 创建浏览器窗口的通用函数
const createBrowserWindow = (type = 'main', options = {}) => {
  const windowId = ++windowIdCounter
  const isMainWindow = type === 'main'

  // 不显式设置 icon,沿用 Electron 自带图标
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
  } else if (options.mode === 'console') {
    // 控制台模式：直接加载独立控制台页面 (pages/console.html)
    if (VITE_DEV_SERVER_URL) {
      // 开发模式:Vite dev server,需要把 pages/ 静态文件路径映射
      // dev server 会把 pages/ 视为 /pages/... 访问不到,这里改用 file://
      window.loadFile(path.join(__dirname, 'pages', 'console.html'))
    } else {
      window.loadFile(path.join(__dirname, 'pages', 'console.html'))
    }
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

  // 按 ESC 关闭窗口。
  // - 在主窗口 webContents 上,过滤掉搜索浮层打开的情况,让渲染层先关搜索。
  // - 子窗口(tab-window)直接关闭。
  // - 必须用 before-input-event 而不是 window keydown,因为 webview 内部的 keydown
  //   不会冒泡到父 window。webview 自身的 ESC 拦截放到下面的 web-contents-created
  //   统一处理。
  window.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      input.key === 'Escape' &&
      !input.alt && !input.control && !input.meta && !input.shift
    ) {
      if (isMainWindow && searchOpenInMain) return
      if (!window.isDestroyed()) window.close()
    }
  })

  // 窗口关闭处理
  window.on('closed', () => {
    if (isMainWindow) {
      mainWindow = null
      // 主窗口关闭时,清掉 ESC 拦截的搜索标志,避免下一次打开主窗口时残留状态
      searchOpenInMain = false
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

app.whenReady().then(async () => {
  buildAppMenu()
  // 启动数字图传本地服务(供 webview 中的图传页面通过 HTTP 收流)
  const videoSvc = await videoService.startService()
  if (!videoSvc.ok) {
    console.error('数字图传本地服务启动失败:', videoSvc.error)
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 应用退出时停止图传服务(关闭 UDP socket 与本地 HTTP 服务)
app.on('will-quit', () => {
  videoService.stopService()
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

    // webview 内部按 ESC 关闭宿主窗口。
    // webview 内的 keydown 不会冒泡到父 window,所以需要在 webview 自己的 webContents 上拦截。
    contents.on('before-input-event', (event, input) => {
      if (
        input.type === 'keyDown' &&
        input.key === 'Escape' &&
        !input.alt && !input.control && !input.meta && !input.shift
      ) {
        const host = contents.hostWebContents
        if (!host) return
        const hostWindow = BrowserWindow.fromWebContents(host)
        if (!hostWindow || hostWindow.isDestroyed()) return
        // 主窗口且搜索浮层打开时,留给渲染层先关搜索
        if (hostWindow === mainWindow && searchOpenInMain) return
        hostWindow.close()
      }
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

// 渲染层通知主进程"全局搜索"浮层是否打开,供 ESC 关闭逻辑判断
ipcMain.on('set-search-state', (_event, isOpen) => {
  searchOpenInMain = !!isOpen
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

// 创建一个独立的"控制台"模式窗口（标题栏工作台/控制台切换触发）
// 同时关闭发送方(工作台)窗口,保证同时只有一个窗口
// 新窗口直接在原工作台位置上打开(原 +40 偏移已移除,避免切换时窗口"跳一下")
ipcMain.handle('create-console-window', (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  if (!senderWindow) return null

  const bounds = senderWindow.getBounds()
  const newWindow = createBrowserWindow('console', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    mode: 'console'
  })
  // 关键修复: 新控制台是"切换目标",不是工作台的子窗口
  // 必须在工作台关闭前把它从 childWindows 摘除,否则工作台 close 的级联会把它也关掉
  childWindows.delete(newWindow)
  // 新窗口可见后再关旧窗口,避免中间出现空隙
  const closeOld = () => {
    if (senderWindow && !senderWindow.isDestroyed()) senderWindow.close()
  }
  if (newWindow.webContents.isLoading()) {
    newWindow.once('ready-to-show', closeOld)
  } else {
    closeOld()
  }
  return newWindow.windowId
})

// 创建一个独立的"工作台"模式窗口（控制台窗口里点"工作台"触发）
// 同时关闭发送方(控制台)窗口,保证同时只有一个窗口
ipcMain.handle('create-main-window', (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  if (!senderWindow) return null

  const bounds = senderWindow.getBounds()
  const newWindow = createBrowserWindow('main', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  })
  // 接管全局 mainWindow 引用
  mainWindow = newWindow
  // 新窗口可见后再关旧窗口,避免中间出现空隙
  const closeOld = () => {
    if (senderWindow && !senderWindow.isDestroyed()) senderWindow.close()
  }
  if (newWindow.webContents.isLoading()) {
    newWindow.once('ready-to-show', closeOld)
  } else {
    closeOld()
  }
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

// webview 页面发起 openTab 请求，转发到主窗口由 useTabs 实际打开
ipcMain.handle('open-tab-request', (_event, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('open-tab-from-main', options || {})
  }
  return null
})

// ========== 控制台窗口 TCP 客户端桥接 (system net,非 W5500) ==========
// 每个控制台窗口对应一个 socket,按 windowId 隔离
const consoleSockets = new Map() // windowId -> { socket, host, port }

function getWindowIdFromEvent(event) {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win?.windowId ?? null
}

ipcMain.handle('console-tcp-connect', (event, options) => {
  const winId = getWindowIdFromEvent(event)
  if (winId == null) return { ok: false, error: 'window-id-missing' }

  // 已有 socket 先关掉
  const existing = consoleSockets.get(winId)
  if (existing?.socket && !existing.socket.destroyed) {
    try { existing.socket.destroy() } catch (e) { /* ignore */ }
  }
  consoleSockets.delete(winId)

  const host = String(options?.host || '192.168.29.10')
  const port = Number(options?.port || 8080)
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return { ok: false, error: 'invalid-port' }
  }

  const socket = new net.Socket()
  socket.setKeepAlive(true, 3000)

  const onClose = () => {
    event.sender.send('console-tcp-event', { type: 'close' })
    const cur = consoleSockets.get(winId)
    if (cur?.socket === socket) consoleSockets.delete(winId)
  }
  const onError = (err) => {
    event.sender.send('console-tcp-event', {
      type: 'error',
      message: err && err.message ? err.message : String(err)
    })
  }
  const onData = (buf) => {
    // 转发原始 Buffer(切分后由渲染层做帧解析)
    event.sender.send('console-tcp-event', {
      type: 'data',
      payload: buf
    })
  }
  socket.on('close', onClose)
  socket.once('error', onError)
  socket.on('data', onData)

  consoleSockets.set(winId, { socket, host, port })
  // 通知渲染层开始连接(异步)
  event.sender.send('console-tcp-event', { type: 'connecting', host, port })

  socket.connect(port, host, () => {
    if (consoleSockets.get(winId)?.socket !== socket) return
    event.sender.send('console-tcp-event', { type: 'connect', host, port })
  })

  return { ok: true, host, port }
})

ipcMain.handle('console-tcp-send', (event, payload) => {
  const winId = getWindowIdFromEvent(event)
  if (winId == null) return { ok: false, error: 'window-id-missing' }
  const entry = consoleSockets.get(winId)
  if (!entry?.socket || entry.socket.destroyed) {
    return { ok: false, error: 'not-connected' }
  }
  let buf
  if (Buffer.isBuffer(payload)) {
    buf = payload
  } else if (payload?.data && Array.isArray(payload.data)) {
    buf = Buffer.from(payload.data)
  } else if (Array.isArray(payload)) {
    buf = Buffer.from(payload)
  } else {
    return { ok: false, error: 'invalid-payload' }
  }
  try {
    entry.socket.write(buf)
    return { ok: true, bytes: buf.length }
  } catch (err) {
    return { ok: false, error: err.message || 'write-failed' }
  }
})

ipcMain.handle('console-tcp-disconnect', (event) => {
  const winId = getWindowIdFromEvent(event)
  if (winId == null) return { ok: false, error: 'window-id-missing' }
  const entry = consoleSockets.get(winId)
  if (!entry) return { ok: true }
  try { entry.socket.destroy() } catch (e) { /* ignore */ }
  consoleSockets.delete(winId)
  return { ok: true }
})

// Ping 测试:用一次性 socket 探测 host:port 的连通性,测量 TCP 三次握手耗时(ms)
// 不影响窗口内已有的持久 socket(若已建立连接)
ipcMain.handle('console-tcp-ping', (_event, options) => {
  const host = String(options?.host || '192.168.29.10')
  const port = Number(options?.port || 8080)
  const timeout = Number(options?.timeout || 1500)
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return { ok: false, error: 'invalid-port', host, port }
  }
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = new net.Socket()
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch (e) { /* ignore */ }
      resolve(result)
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => {
      finish({ ok: true, host, port, ms: Date.now() - start })
    })
    socket.once('error', (err) => {
      finish({
        ok: false,
        host,
        port,
        error: err && err.message ? err.message : String(err)
      })
    })
    socket.once('timeout', () => {
      finish({ ok: false, host, port, error: 'timeout', ms: Date.now() - start })
    })
    try {
      socket.connect(port, host)
    } catch (err) {
      finish({ ok: false, host, port, error: err.message || 'connect-failed' })
    }
  })
})

// 控制台窗口关闭时清理 socket
app.on('browser-window-created', (_event, win) => {
  win.on('closed', () => {
    const entry = consoleSockets.get(win.windowId)
    if (entry?.socket && !entry.socket.destroyed) {
      try { entry.socket.destroy() } catch (e) { /* ignore */ }
    }
    consoleSockets.delete(win.windowId)
  })
})
