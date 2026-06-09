<script setup lang="ts">
import { useTabs, isExternalUrl } from '../composables/useTabs'
import { getLocalIconPath } from '../composables/useTabs'

const {
  tabs,
  activeTab,
  draggedTab,
  switchTab,
  closeTab,
  handleTabMouseUp,
  handleDragStart,
  handleDragEnd
} = useTabs()

function iconFor(tab: { icon: string; favicon?: string; url: string }): string {
  if (isExternalUrl(tab.url)) return tab.favicon || getLocalIconPath('globe')
  return getLocalIconPath(tab.icon)
}

function onIconError(e: Event) {
  const t = e.target as HTMLImageElement
  t.src = getLocalIconPath('globe')
}
</script>

<template>
  <transition-group name="tab" tag="div" class="browser-tabs">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="browser-tab"
      :class="{ active: activeTab === tab.id, loading: tab.loading, dragging: draggedTab === tab.id }"
      @click="switchTab(tab.id)"
      @mouseup="handleTabMouseUp(tab.id, $event)"
      draggable="true"
      @dragstart="handleDragStart(tab.id, $event)"
      @dragend="handleDragEnd"
    >
      <div v-if="activeTab === tab.id" class="tab-indicator"></div>
      <div v-if="tab.loading" class="tab-progress"></div>
      <div class="browser-tab-icon">
        <img
          :src="iconFor(tab)"
          width="14"
          height="14"
          style="border-radius: 2px;"
          @error="onIconError"
        />
      </div>
      <span class="browser-tab-title">{{ tab.title }}</span>
      <div class="browser-tab-close" @click.stop="closeTab(tab.id)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    </div>
  </transition-group>
</template>
