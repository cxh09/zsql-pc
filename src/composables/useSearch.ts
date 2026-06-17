import { ref, computed, nextTick, watch } from 'vue'
import { getLocalIconPath, isTabOpen, openTab as tabsOpenTab, switchTab as tabsSwitchTab } from './useTabs'
import { PAGE_REGISTRY, type PageMeta, type IconName, getIconPath } from './pageRegistry'

export interface SearchPageItem {
  key: string
  title: string
  desc: string
  url: string
  icon: IconName
  keywords: string[]
}

export const AVAILABLE_PAGES: SearchPageItem[] = PAGE_REGISTRY.map((p: PageMeta) => ({
  key: p.key,
  title: p.title,
  desc: p.description ?? '',
  url: p.url,
  icon: p.icon,
  keywords: p.keywords ?? []
}))

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

  function selectItem(item: SearchPageItem) {
    tabsOpenTab(item.title, item.url, item.icon, item.key)
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
