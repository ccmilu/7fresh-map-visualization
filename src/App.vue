<script setup lang="ts">
import MapContainer from './components/MapContainer.vue'
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="app-container flex h-screen w-screen overflow-hidden bg-surface-secondary">
    <!-- 地图区域 -->
    <div class="map-area flex-1 relative">
      <MapContainer />
    </div>
    
    <!-- 侧边栏 -->
    <div class="sidebar-area w-[400px] flex-shrink-0 shadow-panel">
      <Sidebar />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}
</style>
