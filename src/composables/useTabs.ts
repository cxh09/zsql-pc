import { ref, nextTick, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { getElectronAPI } from './useElectron'
import { getIconPath, resolveByKey, resolveByUrl, IconName } from './pageRegistry'

export interface Tab {
  id: string
  title: string
  url: string
  icon: IconName
  pageKey?: string
  favicon?: string
  loading?: boolean
}

let tabIdCounter = 0
function genId() {
  return `tab_${++tabIdCounter}`
}

// Module-level shared state. Using a singleton pattern so all components
// importing useTabs() share the same tabs/activeTab/visitedTabs refs.
const tabs = ref<Tab[]>([])
const activeTab = ref<string | null>(null)
const visitedTabs = ref<Set<string>>(new Set())
const draggedTab = ref<string | null>(null)
let dragStartTime = 0

// Icons are resolved via pageRegistry.getIconPath(); the registry is the
// single source of truth for icon names and their asset paths.
export function getLocalIconPath(iconName: string): string {
  return getIconPath(iconName as IconName, '/pages/')
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

// Cached app root path (populated by initAppPath()). When the renderer is
// served by the Vite dev server, `window.location.href` is `http://localhost:5173/`,
// so resolving `./pages/foo.html` against it makes the webview request the page
// from Vite — which then parse5-validates the HTML and rejects the TDesign
// custom tags. Always resolve local pages against the on-disk app path
// (file://) so they bypass Vite entirely.
let cachedAppPath: string | null = null
export async function initAppPath(): Promise<void> {
  const api = getElectronAPI()
  if (api?.getAppPath) {
    try {
      cachedAppPath = await api.getAppPath()
    } catch {
      cachedAppPath = null
    }
  }
}

function resolveUrl(url: string): string {
  if (/^(https?:|file:)/i.test(url)) return url
  if (url.startsWith('./') || url.startsWith('../')) {
    // Prefer file:// against the app root so webview pages are loaded from
    // disk and never go through the Vite dev server.
    if (cachedAppPath) {
      // Strip leading "./" or "../" segments; the URL API handles the join.
      const normalized = url.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')
      return new URL(normalized, 'file://' + cachedAppPath.replace(/\\/g, '/') + '/').href
    }
    // Fallback (e.g. tests or before initAppPath resolves): use location.
    const currentPath = window.location.href
    const baseUrl = currentPath.substring(0, currentPath.lastIndexOf('/') + 1)
    return new URL(url, baseUrl).href
  }
  return url
}

function attachWebviewListeners() {
  nextTick(() => {
    document.querySelectorAll('webview').forEach((webview) => {
      const wv = webview as HTMLElement & {
        _hasListeners?: boolean
        addEventListener: (type: string, cb: EventListener) => void
      }
      if (wv._hasListeners) return
      wv._hasListeners = true

      const getTab = (): Tab | null => {
        const tabId = webview.getAttribute('data-tab-id')
        if (!tabId) return null
        return tabs.value.find((t) => t.id === tabId) ?? null
      }

      wv.addEventListener('page-title-updated', (e: Event) => {
        // Electron <webview> dispatches native DOM Events; the payload sits on
        // the event itself (ev.title), NOT in ev.detail like CustomEvent.
        const tab = getTab()
        if (!tab) return
        const ev = e as unknown as { title?: string }
        if (typeof ev.title === 'string') tab.title = ev.title
      })

      wv.addEventListener('did-navigate', (e: Event) => {
        const tab = getTab()
        if (!tab) return
        const ev = e as unknown as { url?: string }
        if (typeof ev.url === 'string') tab.url = ev.url
      })

      wv.addEventListener('did-navigate-in-page', (e: Event) => {
        const ev = e as unknown as { isMainFrame?: boolean; url?: string }
        if (!ev.isMainFrame) return
        const tab = getTab()
        if (tab && typeof ev.url === 'string') tab.url = ev.url
      })

      wv.addEventListener('did-start-loading', () => {
        const tab = getTab()
        if (tab) tab.loading = true
      })

      wv.addEventListener('did-stop-loading', () => {
        const tab = getTab()
        if (tab) tab.loading = false
      })

      wv.addEventListener('did-finish-load', () => {
        const tab = getTab()
        if (!tab) return
        tab.loading = false
        if (!isExternalUrl(tab.url)) return
        const wvAny = webview as unknown as {
          executeJavaScript: (script: string) => Promise<unknown>
        }
        try {
          wvAny
            .executeJavaScript(`(()=>{let link=document.querySelector('link[rel="icon"]')||document.querySelector('link[rel="shortcut icon"]')||document.querySelector('link[rel*="icon"]');if(link&&link.href){if(link.href.startsWith('//'))return location.protocol+link.href;if(link.href.startsWith('/'))return location.origin+link.href;if(!link.href.startsWith('http'))return new URL(link.href,location.href).href;return link.href}return null})()`)
            .then((iconUrl) => {
              if (typeof iconUrl === 'string' && iconUrl) tab.favicon = iconUrl
            })
            .catch(() => {})
        } catch {
          /* ignore */
        }
      })

      wv.addEventListener('did-fail-load', () => {
        const tab = getTab()
        if (tab) tab.loading = false
      })
    })
  })
}

function cleanupWebview(tabId: string) {
  nextTick(() => {
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as
      | (HTMLElement & { stop?: () => void; src?: string })
      | null
    if (webview) {
      try {
        if (webview.stop) webview.stop()
        ;(webview as unknown as { src: string }).src = 'about:blank'
        ;(webview as unknown as { _hasListeners: boolean })._hasListeners = false
      } catch {
        /* ignore */
      }
    }
    const all = document.querySelectorAll('webview')
    const ids = new Set(tabs.value.map((t) => t.id))
    all.forEach((wv) => {
      const id = wv.getAttribute('data-tab-id')
      if (id && !ids.has(id)) {
        try {
          const w = wv as unknown as { stop?: () => void; src: string; _hasListeners: boolean }
          if (w.stop) w.stop()
          w.src = 'about:blank'
          w._hasListeners = false
        } catch {
          /* ignore */
        }
      }
    })
  })
}

function cleanupAllWebviews() {
  nextTick(() => {
    document.querySelectorAll('webview').forEach((webview) => {
      try {
        const w = webview as unknown as { stop?: () => void; src: string; _hasListeners: boolean }
        if (w.stop) w.stop()
        w.src = 'about:blank'
        w._hasListeners = false
      } catch {
        /* ignore */
      }
    })
    visitedTabs.value.clear()
  })
}

/**
 * Top-level imperative API. Other composables (e.g. useSearch) and event
 * listeners call these directly without going through useTabs().
 */
export function openTab(title: string, url: string, icon?: IconName, pageKey?: string): string {
  const resolvedUrl = resolveUrl(url)
  const resolvedIcon: IconName = (icon ?? (pageKey ? resolveByKey(pageKey)?.icon : undefined)) ?? 'globe'
  const newTab: Tab = {
    id: genId(),
    title,
    url: resolvedUrl,
    icon: resolvedIcon,
    ...(pageKey ? { pageKey } : {})
  }
  tabs.value.push(newTab)
  activeTab.value = newTab.id
  visitedTabs.value.add(newTab.id)
  attachWebviewListeners()
  return newTab.id
}

export function closeTab(tabId: string) {
  const index = tabs.value.findIndex((t) => t.id === tabId)
  if (index === -1) return
  if (activeTab.value === tabId) {
    if (tabs.value.length > 1) {
      const newIndex = index < tabs.value.length - 1 ? index + 1 : index - 1
      activeTab.value = tabs.value[newIndex].id
    } else {
      activeTab.value = null
    }
  }
  tabs.value.splice(index, 1)
  visitedTabs.value.delete(tabId)
  cleanupWebview(tabId)
}

export function switchTab(tabId: string) {
  activeTab.value = tabId
  visitedTabs.value.add(tabId)
}

export function isTabOpen(url: string | null, pageKey?: string): boolean {
  return tabs.value.some((tab) => (pageKey ? tab.pageKey === pageKey : tab.url === url))
}

export function clearAllTabs() {
  cleanupAllWebviews()
  tabs.value = []
  activeTab.value = null
}

export function useTabs() {
  function refreshActiveTab() {
    if (!activeTab.value) return
    const wv = document.querySelector('webview.active') as
      | (HTMLElement & { reload?: () => void })
      | null
    if (wv?.reload) {
      wv.reload()
    } else {
      const tab = tabs.value.find((t) => t.id === activeTab.value)
      if (tab) {
        const original = tab.url
        tab.url = 'about:blank'
        setTimeout(() => {
          tab.url = original
        }, 10)
      }
    }
  }

  function handleTabMouseUp(tabId: string, e: MouseEvent) {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  function handleDragStart(tabId: string, event: DragEvent) {
    draggedTab.value = tabId
    dragStartTime = Date.now()
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', tabId)
    }
  }

  async function handleDragEnd(event: DragEvent) {
    const tabId = draggedTab.value
    draggedTab.value = null
    if (!tabId) return
    const tab = tabs.value.find((t) => t.id === tabId)
    if (!tab) return
    const { clientY } = event
    const titleBarHeight = 50
    if (clientY > titleBarHeight) {
      closeTab(tabId)
      const api = getElectronAPI()
      if (api?.createTabWindow) {
        await api.createTabWindow({
          url: tab.url,
          title: tab.title,
          icon: tab.icon
        })
      }
    }
  }

  function confirmLogout() {
    const dlg = DialogPlugin.confirm({
      header: '确认退出账号',
      body: '退出账号后将清除当前登录状态，是否继续？',
      onConfirm: () => {
        dlg.destroy()
        cleanupAllWebviews()
        clearAllTabs()
        MessagePlugin.info('已退出登录')
      },
      onCancel: () => dlg.destroy()
    })
  }

  // Reattach listeners whenever the active tab changes (forces webview redraw).
  watch(activeTab, () => {
    nextTick(() => {
      const activeTabEl = document.querySelector('.browser-tab.active') as HTMLElement | null
      if (activeTabEl) {
        const container = activeTabEl.closest('.browser-tabs') as HTMLElement | null
        if (container) {
          const c = container.getBoundingClientRect()
          const r = activeTabEl.getBoundingClientRect()
          if (r.right > c.right) container.scrollLeft += r.right - c.right + 4
          else if (r.left < c.left) container.scrollLeft -= c.left - r.left + 4
        }
      }
      const webview = document.querySelector('webview.active') as HTMLElement | null
      if (webview) {
        ;(webview as unknown as { style: { flex: string } }).style.flex = '0.9999'
        requestAnimationFrame(() => {
          ;(webview as unknown as { style: { flex: string } }).style.flex = '1'
        })
      }
    })
  })

  // Wire global listeners once (idempotent across multiple component mounts).
  let wired = false
  function wireGlobalListeners() {
    if (wired) return
    wired = true
    const api = getElectronAPI()
    api?.onOpenNewTab?.((url: string) => {
      const meta = resolveByUrl(url)
      if (meta) {
        openTab(meta.title, url, meta.icon, meta.key)
      } else {
        // 未在 registry 中识别的外部 URL,使用 hostname 作为 title,globe 作为 icon
        let title = '浏览器'
        try {
          title = new URL(url).hostname
        } catch {
          /* default */
        }
        openTab(title, url, 'globe')
      }
    })

    api?.onMainMessage?.('merge-tab-back', (tabData: unknown) => {
      const t = tabData as { title: string; url: string; icon: string }
      openTab(t.title, t.url, t.icon as IconName)
      MessagePlugin.success('标签页已合并')
    })

    api?.onMainMessage?.('open-tab-from-main', (options: unknown) => {
      const opts = (options ?? {}) as {
        pageKey?: string
        title?: string
        url?: string
        icon?: IconName
      }
      // 优先使用 pageKey 在 registry 中推导完整元数据
      if (opts.pageKey) {
        const meta = resolveByKey(opts.pageKey)
        if (meta) {
          openTab(opts.title ?? meta.title, opts.url ?? meta.url, opts.icon ?? meta.icon, meta.key)
          return
        }
      }
      // 退化路径:按调用方传入的 url/title/icon 打开
      if (opts.url) {
        openTab(opts.title ?? '新标签页', opts.url, opts.icon)
      }
    })
  }

  return {
    tabs,
    activeTab,
    visitedTabs,
    draggedTab,
    openTab,
    switchTab,
    closeTab,
    isTabOpen,
    refreshActiveTab,
    handleTabMouseUp,
    handleDragStart,
    handleDragEnd,
    getLocalIconPath,
    isExternalUrl,
    clearAllTabs,
    confirmLogout,
    wireGlobalListeners
  }
}
