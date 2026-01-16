<script setup lang="ts">
import { ref } from 'vue'
import MapContainer from './components/MapContainer.vue'
import Sidebar from './components/Sidebar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="app-container flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-surface-secondary">
    <!-- 地图区域 -->
    <div class="map-area flex-1 relative min-h-[50vh] lg:min-h-0">
      <MapContainer />
      
      <!-- 移动端展开侧边栏按钮 -->
      <button 
        @click="sidebarOpen = !sidebarOpen"
        class="lg:hidden absolute bottom-4 right-4 z-50 w-12 h-12 bg-jd-red text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <svg v-if="!sidebarOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- 侧边栏 - 桌面端固定显示，移动端抽屉式 -->
    <div 
      :class="[
        'sidebar-area bg-surface shadow-panel transition-transform duration-300 ease-in-out',
        'fixed lg:relative inset-y-0 right-0 z-40',
        'w-[85vw] sm:w-[360px] lg:w-[400px]',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      ]"
    >
      <Sidebar />
    </div>
    
    <!-- 移动端遮罩层 -->
    <div 
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="lg:hidden fixed inset-0 bg-black/30 z-30"
    />
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}
</style>
