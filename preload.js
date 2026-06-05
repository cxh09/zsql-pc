const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  maximize: () => ipcRenderer.invoke('window-maximize'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onOpenNewTab: (callback) => {
    ipcRenderer.on('open-new-tab', (_event, url) => callback(url))
  },
  logout: () => ipcRenderer.invoke('logout'),
  onLogout: (callback) => {
    ipcRenderer.on('logout-request', () => callback())
  }
})
