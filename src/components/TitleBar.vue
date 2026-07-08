<script setup lang="ts">
import { ref } from 'vue'
import { useWindowInfo } from '../composables/useWindowInfo'
import { useTabs } from '../composables/useTabs'
import { getElectronAPI } from '../composables/useElectron'
import BrowserTabs from './BrowserTabs.vue'

const { isLoggedIn } = useWindowInfo()
const { refreshActiveTab } = useTabs()

// 从 URL 参数初始化模式（控制台模式新窗口会带 ?mode=console 打开）
function getInitialMode(): '工作台' | '控制台' {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'console' ? '控制台' : '工作台'
  } catch {
    return '工作台'
  }
}

const modeText = ref<'工作台' | '控制台'>(getInitialMode())

// 切换中状态: 切到控制台时显示 2 秒 TDesign 全屏 loading,再走真正的"关旧开新"流程
const switchingTo = ref<'' | 'console' | 'main'>('')
const SWITCH_DELAY_MS = 2000

// TDesign 填充型按钮组:点击不同选项触发不同动作
// - 点"控制台": 显示 2 秒 loading → 唤起独立的控制台窗口(主进程同步关旧窗口)
// - 点"工作台": 仅本地切换文字(实际切换走 create-main-window 走对端窗口)
function onModeChange(newMode: '工作台' | '控制台') {
  if (newMode === modeText.value) return
  if (newMode === '控制台') {
    switchingTo.value = 'console'
    setTimeout(() => {
      modeText.value = '控制台'
      switchingTo.value = ''
      getElectronAPI()?.createConsoleWindow?.()
    }, SWITCH_DELAY_MS)
  } else {
    modeText.value = '工作台'
  }
}

function minimize() { getElectronAPI()?.minimize() }
function maximize() { getElectronAPI()?.maximize() }
function close() { getElectronAPI()?.closeWindow() }
</script>

<template>
  <div class="browser-title-bar">
    <div class="title-bar-brand">
      <img src="/assets/external/electron-logo.svg" alt="Electron" />
      <span>智拾清澜</span>
      <t-radio-group
        class="title-bar-interactive"
        variant="default-filled"
        size="small"
        :value="modeText"
        @change="onModeChange"
        :title="`当前: ${modeText}, 点击切换`"
      >
        <t-radio-button class="title-bar-interactive" value="工作台">工作台</t-radio-button>
        <t-radio-button class="title-bar-interactive" value="控制台">控制台</t-radio-button>
      </t-radio-group>
    </div>

    <template v-if="isLoggedIn">
      <BrowserTabs />
      <div class="tab-bar-tools">
        <div class="tab-tool-btn" @click="refreshActiveTab" title="刷新">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </div>
      </div>
    </template>
    <div v-else style="flex: 1;"></div>

    <div class="title-bar-window-controls">
      <div class="window-btn minimize" @click="minimize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <div class="window-btn maximize" @click="maximize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      </div>
      <div class="window-btn close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    </div>

    <!-- 切换工作台/控制台时的过渡 loading (毛玻璃 + 纯 spinner,不要文字) -->
    <!-- showOverlay=false 关闭 TDesign 自带 backdrop,用下方自定义 div 做 1s 毛玻璃淡入 -->
    <t-loading
      :loading="!!switchingTo"
      fullscreen
      size="large"
      :show-overlay="false"
      :z-index="9999"
    />
    <transition name="switch-fade">
      <div v-if="switchingTo" class="switch-overlay" :key="switchingTo"></div>
    </transition>
  </div>
</template>

<style scoped>
/* 切换工作台/控制台时的毛玻璃背景: 1s 淡入(TDesign 自带 backdrop 不会重新触发动画,用 Vue transition 强制每次都跑) */
.switch-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;        /* 在页面内容之上(< TDesign Lm=6000),让 t-loading 的 spinner 永远在最上面 */
  pointer-events: none;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(16px);
}
.switch-fade-enter-active {
  transition:
    background-color 1s ease,
    backdrop-filter 1s ease;
}
.switch-fade-enter-from {
  background-color: rgba(255, 255, 255, 0);
  backdrop-filter: blur(0);
}
</style>
