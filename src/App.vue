<script setup lang="ts">
import { ref, computed } from 'vue'
import MapContainer from './components/MapContainer.vue'
import Sidebar from './components/Sidebar.vue'
import { generateInsights } from './utils/mockData'

const sidebarOpen = ref(false)

// 检查是否有高优先级洞察（红色警告）
const insights = generateInsights()
const hasHighPriorityAlert = computed(() => {
  return insights.some(i => i.priority === 'high' || (i.type === 'warning' && i.priority !== 'low'))
})
const highPriorityCount = computed(() => {
  return insights.filter(i => i.priority === 'high' || (i.type === 'warning' && i.priority !== 'low')).length
})

// 控制是否播放动画（点击后停止，刷新后恢复）
const isAlertAnimating = ref(true)

// 点击警告图标：停止动画 + 打开侧边栏并滚动到洞察区域
function handleAlertClick() {
  isAlertAnimating.value = false
  sidebarOpen.value = true
  // 等待侧边栏打开后滚动到洞察区域
  setTimeout(() => {
    const insightSection = document.querySelector('.sidebar-area .insight-card')
    insightSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 350)
}
</script>

<template>
  <div class="app-container flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-surface-secondary">
    <!-- 地图区域 -->
    <div class="map-area flex-1 relative min-h-[50vh] lg:min-h-0">
      <MapContainer />
      
      <!-- 高优先级洞察跳动提示图标 -->
      <button
        v-if="hasHighPriorityAlert"
        @click="handleAlertClick"
        :class="[
          'absolute bottom-28 lg:bottom-6 left-1/2 translate-x-[180%] lg:left-auto lg:right-[300px] lg:translate-x-0 z-50 flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors',
          isAlertAnimating ? 'alert-pulse' : ''
        ]"
        title="有紧急洞察需要关注"
      >
        <span :class="['relative flex items-center justify-center', isAlertAnimating ? 'alert-icon' : '']">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </svg>
          <span v-if="isAlertAnimating" class="ping-ring"></span>
        </span>
        <span class="text-sm font-medium hidden sm:inline">{{ highPriorityCount }}条预警</span>
      </button>
      
      <!-- 移动端展开侧边栏按钮 -->
      <button 
        @click="sidebarOpen = !sidebarOpen"
        class="lg:hidden absolute bottom-12 right-4 z-50 w-12 h-12 bg-jd-red text-white rounded-full shadow-lg flex items-center justify-center"
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

/* 警告图标跳动动画 */
.alert-pulse {
  animation: pulse-bounce 2s ease-in-out infinite;
}

.alert-icon {
  animation: shake 0.5s ease-in-out infinite;
}

.ping-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes pulse-bounce {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
  }
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-8deg); }
  75% { transform: rotate(8deg); }
}

@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%, 100% {
    transform: scale(1.8);
    opacity: 0;
  }
}
</style>
