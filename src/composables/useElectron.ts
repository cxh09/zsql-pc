/**
 * useElectron - thin typed wrapper around `window.electronAPI` exposed by preload.js.
 * Centralizes all main-process IPC calls so components stay decoupled.
 */
export interface ElectronAPI {
  // Window controls
  maximize: () => Promise<void>
  isMaximized: () => Promise<boolean>
  minimize: () => Promise<void>
  closeWindow: () => Promise<void>

  // Tab events
  onOpenNewTab: (cb: (url: string) => void) => void
  createTabWindow: (options: Record<string, unknown>) => Promise<number | null>
  getWindowInfo: () => Promise<{ windowId: number | null; windowType: string } | null>
  sendToMain: (channel: string, ...args: unknown[]) => Promise<void>
  getChildWindows: () => Promise<Array<{ windowId: number; title: string }>>
  onChildWindowClosed: (cb: (windowId: number) => void) => void
  onMainMessage: (channel: string, cb: (...args: unknown[]) => void) => void
  onToggleSearch: (cb: () => void) => void
  removeAllListeners: (channel: string) => void

  // Auth
  logout: () => Promise<void>
  onLogout: (cb: () => void) => void

  // Theme
  setTheme: (theme: 'light' | 'dark') => Promise<void>
  onThemeChange: (cb: (theme: 'light' | 'dark') => void) => void

  // Devtools
  openDevTools: () => Promise<void>

  // App root path (used to resolve webview subpages to file:// URLs)
  getAppPath: () => Promise<string>

  // Allow main app to inject openTab
  openTab?: (title: string, url: string, icon?: string, pageKey?: string) => string
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function getElectronAPI(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined
}
