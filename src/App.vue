<script setup lang="ts">
import MapContainer from './components/MapContainer.vue'
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="app-container flex h-screen w-screen overflow-hidden bg-gray-100">
    <!-- 地图区域 -->
    <div class="map-area flex-1 relative">
      <MapContainer />
    </div>
    
    <!-- 侧边栏 -->
    <div class="sidebar-area w-[380px] flex-shrink-0">
      <Sidebar />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}
</style>
