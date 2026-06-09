import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

import App from './App.vue'
import './styles/global.css'
import { useSearch } from './composables/useSearch'
import { useWindowInfo } from './composables/useWindowInfo'
import { getElectronAPI } from './composables/useElectron'
import { initAppPath } from './composables/useTabs'

// Resolve the on-disk app root BEFORE Vue mounts so that any `openTab('./pages/...')`
// called during initial render (e.g. after login) uses file:// URLs and bypasses
// the Vite dev server (which would parse5-reject the TDesign custom tags).
void initAppPath()

const app = createApp(App)

// Note: <webview> custom-element handling is configured in vite.config.js
// via the @vitejs/plugin-vue `template.compilerOptions.isCustomElement` option,
// because the runtime-only Vue build ignores `app.config.compilerOptions`.

app.use(TDesign)
app.mount('#app')

// Wire up global behaviors that need to live outside the Vue tree.
//
// Note: App.vue is mounted before this code runs, so useSearch() and
// useWindowInfo() can read the existing module-level refs.
const { isLoggedIn } = useWindowInfo()
const { toggleSearch } = useSearch()

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd+K to open the global search (works in dev, no webview focus).
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    if (!isLoggedIn.value) return
    e.preventDefault()
    toggleSearch()
  }
}
document.addEventListener('keydown', handleGlobalKeydown)

// Main-process menu accelerator (Ctrl+K works even when a webview has focus).
getElectronAPI()?.onToggleSearch?.(() => {
  if (!isLoggedIn.value) return
  toggleSearch()
})

// Auth: main process may request logout (e.g. via menu).
getElectronAPI()?.onLogout?.(() => {
  isLoggedIn.value = false
})
