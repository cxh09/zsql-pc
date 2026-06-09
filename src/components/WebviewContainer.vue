<script setup lang="ts">
import { useTabs } from '../composables/useTabs'

const { tabs, activeTab, visitedTabs } = useTabs()
</script>

<template>
  <div class="content-area">
    <div v-if="tabs.length === 0" class="empty-state"></div>
    <div v-else class="webview-container">
      <template v-for="tab in tabs" :key="tab.id">
        <webview
          v-if="visitedTabs.has(tab.id)"
          :data-tab-id="tab.id"
          :src="tab.url"
          class="page-webview"
          :class="{ active: activeTab === tab.id }"
          nodeintegration="false"
          webpreferences="contextIsolation=true"
          allowpopups
          javascript="yes"
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        ></webview>
        <div
          v-else
          class="webview-placeholder"
          :class="{ active: activeTab === tab.id }"
        >
          <div class="placeholder-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p>点击标签加载页面</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
