import { ref } from 'vue'
import { getElectronAPI } from './useElectron'

const isLoggedIn = ref(false)
const windowInfo = ref<{ windowId: number | null; windowType: string }>({
  windowId: null,
  windowType: 'main'
})

export function useWindowInfo() {
  async function initWindowInfo() {
    const api = getElectronAPI()
    if (api?.getWindowInfo) {
      const info = await api.getWindowInfo()
      if (info) windowInfo.value = info
    }
  }

  return { isLoggedIn, windowInfo, initWindowInfo }
}
