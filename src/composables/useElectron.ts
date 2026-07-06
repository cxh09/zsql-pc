/**
 * useElectron - thin typed wrapper around `window.electronAPI` exposed by preload.js.
 * Centralizes all main-process IPC calls so components stay decoupled.
 */
import type { IconName } from './pageRegistry'

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
  setSearchState: (isOpen: boolean) => void
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

  /**
   * 打开新标签页。
   * - 在主窗口 Vue 组件中由 useTabs.openTab 直接调用,无需走此 API。
   * - 在 webview 页面中通过 preload 暴露的 IPC 触发。
   * - 支持基于 pageKey 推导 icon/title(由主进程侧的 pageRegistry 完成)。
   * @returns 新建 tab 的 id;若该 pageKey 已有 tab 则激活并返回其 id。
   */
  openTab: (options: {
    pageKey?: string
    title?: string
    url?: string
    icon?: IconName
  }) => Promise<string | null>

  /**
   * 同步获取 icon 的资源路径(主窗口上下文返回 /pages/icon-*.svg 绝对路径)
   */
  getIconPath: (name: IconName) => string

  /**
   * 同步按 pageKey 解析页面元数据(用于 webview 页面)
   */
  resolvePage: (pageKey: string) => { title: string; url: string; icon: IconName } | null
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function getElectronAPI(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined
}
