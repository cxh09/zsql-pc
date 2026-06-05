const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')

let mainWindow = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
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
      webviewTag: true
    }
  })

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

  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  mainWindow.setMenu(null)

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
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
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
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
