<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Workbench from './views/Workbench.vue'
import LoginPage from './views/LoginPage.vue'
import SearchOverlay from './components/SearchOverlay.vue'
import { useTheme } from './composables/useTheme'
import { useWindowInfo } from './composables/useWindowInfo'

const { loadTheme } = useTheme()
const { isLoggedIn, initWindowInfo } = useWindowInfo()

onMounted(() => {
  loadTheme()
  initWindowInfo()
})
</script>

<template>
  <TitleBar />
  <LoginPage v-if="!isLoggedIn" />
  <Workbench v-else />
  <SearchOverlay />
</template>
