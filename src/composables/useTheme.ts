import { ref, watch } from 'vue'
import { getElectronAPI } from './useElectron'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')

function applyThemeClass(t: Theme) {
  if (typeof document === 'undefined') return
  if (t === 'dark') {
    document.documentElement.setAttribute('class', 'tdesign-theme__dark')
  } else {
    document.documentElement.setAttribute('class', '')
  }
}

export function useTheme() {
  function loadTheme() {
    try {
      const saved = localStorage.getItem('tdesign-theme') as Theme | null
      if (saved === 'dark' || saved === 'light') {
        theme.value = saved
        applyThemeClass(saved)
      }
    } catch {
      /* ignore */
    }
  }

  function setTheme(t: Theme) {
    theme.value = t
    applyThemeClass(t)
    try {
      localStorage.setItem('tdesign-theme', t)
    } catch {
      /* ignore */
    }
    getElectronAPI()?.setTheme(t)
  }

  // Cross-window theme sync.
  getElectronAPI()?.onThemeChange?.((t) => {
    theme.value = t
    applyThemeClass(t)
    try {
      localStorage.setItem('tdesign-theme', t)
    } catch {
      /* ignore */
    }
  })

  watch(theme, (t) => applyThemeClass(t))

  return { theme, loadTheme, setTheme }
}
