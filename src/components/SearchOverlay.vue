<script setup lang="ts">
import { useSearch } from '../composables/useSearch'
import { useWindowInfo } from '../composables/useWindowInfo'

const { isLoggedIn } = useWindowInfo()
const {
  searchOpen,
  searchKeyword,
  activeSearchIndex,
  searchInputEl,
  pageResults,
  closeSearch,
  selectItem,
  handleKeydown
} = useSearch()
</script>

<template>
  <teleport to="body">
    <div
      v-if="isLoggedIn"
      class="search-overlay"
      :class="{ open: searchOpen }"
      @click.self="closeSearch"
    >
      <div class="search-panel" @click.stop>
        <div class="search-input-wrap">
          <svg class="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref="searchInputEl"
            v-model="searchKeyword"
            class="search-input"
            type="text"
            placeholder="全局搜索"
            @keydown="handleKeydown"
          />
        </div>

        <div class="search-results-row" :class="{ expanded: !!searchKeyword }">
          <div class="search-results">
            <template v-if="pageResults.length > 0">
              <div class="search-section-title">功能</div>
              <div
                v-for="(item, idx) in pageResults"
                :key="'page-' + item.key"
                class="search-item"
                :class="{ active: activeSearchIndex === idx }"
                @click="selectItem(item)"
                @mouseenter="activeSearchIndex = idx"
              >
                <div class="search-item-icon">
                  <img :src="item.iconSrc" alt="" />
                </div>
                <div class="search-item-content">
                  <div class="search-item-title">{{ item.title }}</div>
                  <div class="search-item-desc">{{ item.desc }}</div>
                </div>
              </div>
            </template>
            <div v-else-if="searchKeyword" class="search-empty">
              没有找到匹配 "{{ searchKeyword }}" 的功能
            </div>
          </div>
        </div>

        <div class="search-footer">
          <div class="search-footer-keys">
            <span><kbd>↑</kbd><kbd>↓</kbd> 切换</span>
            <span><kbd>↵</kbd> 打开</span>
            <span><kbd>ESC</kbd> 关闭</span>
          </div>
          <span>智拾清澜工作台</span>
        </div>
      </div>
    </div>
  </teleport>
</template>
