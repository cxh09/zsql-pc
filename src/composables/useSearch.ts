import { ref, computed, nextTick, watch } from 'vue'
import { getLocalIconPath, isTabOpen, openTab as tabsOpenTab, switchTab as tabsSwitchTab } from './useTabs'

export interface PageItem {
  key: string
  title: string
  desc: string
  url: string
  icon: string
  keywords: string[]
}

export const AVAILABLE_PAGES: PageItem[] = [
  { key: 'dashboard', title: '主页', desc: '工作台主页面，查看概览数据', url: './pages/dashboard.html', icon: 'home', keywords: ['首页', '主页面', '工作台', 'home'] },
  { key: 'applications', title: '预约查看', desc: '查看和管理所有预约申请', url: './pages/applications.html', icon: 'file', keywords: ['预约', '申请', '列表', 'application'] },
  { key: 'customerService', title: '客户会话', desc: '微信客服聊天会话管理', url: 'https://chatbot.weixin.qq.com/@ideaaaf6b/platform/statistic/customerService', icon: 'message', keywords: ['客服', '会话', '聊天', '客户', 'message'] },
  { key: 'browser', title: '浏览器', desc: '内置浏览器，访问任意网页', url: './pages/browser.html', icon: 'browser', keywords: ['浏览器', '网页', 'browser'] },
  { key: 'navigation', title: '路线规划', desc: '地图与路线规划', url: './pages/navigation.html', icon: 'navigation', keywords: ['地图', '导航', '路线', '规划', 'navigation'] },
  { key: 'account', title: '账户信息', desc: '查看和编辑个人账户信息', url: './pages/account.html', icon: 'user', keywords: ['账户', '个人', '资料', 'account', 'user'] },
  { key: 'settings', title: '系统设置', desc: '系统偏好与全局设置', url: './pages/settings.html', icon: 'settings', keywords: ['设置', '系统设置', '偏好', 'settings'] },
  { key: 'changelog', title: '更新日志', desc: '查看应用版本更新历史', url: './pages/changelog.html', icon: 'file', keywords: ['更新', '日志', '版本', 'changelog'] },
  { key: 'networkDiagnosis', title: '网络质量监测', desc: '检测网络连接质量与延迟', url: './pages/network-diagnosis.html', icon: 'network', keywords: ['网络', '监测', '诊断', 'network'] }
]

const searchOpen = ref(false)
const searchKeyword = ref('')
const activeSearchIndex = ref(-1)
const searchInputEl = ref<HTMLInputElement | null>(null)

const pageResults = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return []
  return AVAILABLE_PAGES.filter((p) => {
    if (p.title.toLowerCase().includes(kw)) return true
    if (p.key.toLowerCase().includes(kw)) return true
    if (p.desc.toLowerCase().includes(kw)) return true
    if (p.keywords?.some((k) => k.toLowerCase().includes(kw))) return true
    return false
  }).map((p) => ({
    key: p.key,
    title: p.title,
    desc: p.desc,
    url: p.url,
    icon: p.icon,
    iconSrc: getLocalIconPath(p.icon),
    opened: false,
    isOpenTab: false
  }))
})

export function useSearch() {
  function focusInput() {
    const el = searchInputEl.value
    if (el) {
      el.focus({ preventScroll: true })
      el.select?.()
    }
  }

  function openSearch() {
    searchOpen.value = true
    searchKeyword.value = ''
    activeSearchIndex.value = -1
    nextTick(focusInput)
    requestAnimationFrame(focusInput)
    setTimeout(focusInput, 50)
  }

  function closeSearch() {
    searchOpen.value = false
    searchKeyword.value = ''
  }

  function toggleSearch() {
    if (searchOpen.value) closeSearch()
    else openSearch()
  }

  function selectItem(item: { key: string; title: string; url: string; icon: string }) {
    if (isTabOpen(null, item.key)) {
      // re-resolve active tab id - isTabOpen returns boolean only; rely on openTab to dedupe not necessary
      // Simpler: just call openTab with the key, openTab creates a new tab. To switch instead, we use a helper.
      // For simplicity here, re-open via tabsOpenTab (which always pushes a new tab). To switch behavior, we
      // import the underlying switch function via the existing tabs store.
      tabsOpenTab(item.title, item.url, item.icon, item.key)
    } else {
      tabsOpenTab(item.title, item.url, item.icon, item.key)
    }
    closeSearch()
  }

  function handleKeydown(e: KeyboardEvent) {
    const results = pageResults.value
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length > 0) {
        activeSearchIndex.value =
          activeSearchIndex.value < 0 ? 0 : (activeSearchIndex.value + 1) % results.length
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length > 0) {
        activeSearchIndex.value =
          activeSearchIndex.value < 0
            ? results.length - 1
            : (activeSearchIndex.value - 1 + results.length) % results.length
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeSearchIndex.value < 0) return
      const item = results[activeSearchIndex.value]
      if (item) selectItem(item)
    }
  }

  // Linear expand/collapse animation for the results row.
  watch(searchKeyword, () => {
    nextTick(() => {
      const row = document.querySelector('.search-results-row') as HTMLElement | null
      const inner = row?.querySelector('.search-results') as HTMLElement | null
      if (!row || !inner) return
      if (searchKeyword.value) {
        const prev = inner.style.maxHeight
        inner.style.maxHeight = 'none'
        const natural = inner.scrollHeight
        inner.style.maxHeight = prev
        if (!row.style.maxHeight || row.style.maxHeight === '0px') {
          row.style.maxHeight = '0px'
          void row.offsetHeight
        }
        row.style.maxHeight = natural + 'px'
      } else {
        const current = row.offsetHeight
        if (current > 0) {
          row.style.maxHeight = current + 'px'
          void row.offsetHeight
        }
        row.style.maxHeight = '0px'
      }
    })
  })

  return {
    searchOpen,
    searchKeyword,
    activeSearchIndex,
    searchInputEl,
    pageResults,
    openSearch,
    closeSearch,
    toggleSearch,
    selectItem,
    handleKeydown
  }
}
