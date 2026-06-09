<script setup lang="ts">
import { useWindowInfo } from '../composables/useWindowInfo'
import { useTabs } from '../composables/useTabs'
import { getElectronAPI } from '../composables/useElectron'
import BrowserTabs from './BrowserTabs.vue'

const { isLoggedIn } = useWindowInfo()
const { refreshActiveTab } = useTabs()

function minimize() { getElectronAPI()?.minimize() }
function maximize() { getElectronAPI()?.maximize() }
function close() { getElectronAPI()?.closeWindow() }
</script>

<template>
  <div class="browser-title-bar">
    <div class="title-bar-brand">
      <img src="/assets/external/electron-logo.svg" alt="Electron" />
      <span>智拾清澜工作台</span>
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
  </div>
</template>
