<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES } from '@/data/stores'

const appStore = useAppStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const mapError = ref<string | null>(null)

// 地图实例
let mapInstance: any = null
let AMap: any = null

// 门店标记点
const storeMarkers: any[] = []

onMounted(async () => {
  await initMap()
})

// 初始化地图
async function initMap() {
  try {
    // 动态加载高德地图
    const AMapLoader = await import('@amap/amap-jsapi-loader')
    AMap = await AMapLoader.default.load({
      key: 'f0b62029693159ed13b40c40b7a48370',
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar']
    })

    if (!mapContainer.value) return

    mapInstance = new AMap.Map(mapContainer.value, {
      viewMode: '2D',
      zoom: 11,
      center: [116.497, 39.944], // 北京朝阳区中心
      mapStyle: 'amap://styles/light',
      resizeEnable: true
    })

    // 添加控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar({ position: 'LT' }))

    // 添加门店标记
    addStoreMarkers()

    mapLoading.value = false
  } catch (error) {
    mapError.value = '地图加载失败，请检查网络或API Key'
    mapLoading.value = false
    console.error('地图初始化失败:', error)
  }
}

// 添加门店标记点
function addStoreMarkers() {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  storeMarkers.forEach(m => mapInstance.remove(m))
  storeMarkers.length = 0

  STORES.forEach(store => {
    // 创建自定义标记内容
    const markerContent = `
      <div class="store-marker" style="
        background: linear-gradient(135deg, #E2231A, #FF6600);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        transform: translateX(-50%);
      ">
        🏪 ${store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '')}
      </div>
    `

    const marker = new AMap.Marker({
      position: [store.lon, store.lat],
      content: markerContent,
      offset: new AMap.Pixel(0, -20),
      extData: store
    })

    marker.on('click', () => {
      appStore.selectStore(store.id)
      // 弹出信息窗口
      showStoreInfo(store)
    })

    storeMarkers.push(marker)
    mapInstance.add(marker)
  })
}

// 显示门店信息窗口
function showStoreInfo(store: typeof STORES[0]) {
  if (!AMap || !mapInstance) return

  const infoContent = `
    <div style="padding: 12px; min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">${store.name}</h3>
      <div style="font-size: 12px; color: #666; line-height: 1.8;">
        <p>📦 日均单量：<strong>${store.daily_orders}</strong> 单</p>
        <p>✓ 准时率：<strong style="color: ${store.on_time_rate >= 0.9 ? '#52c41a' : store.on_time_rate >= 0.85 ? '#faad14' : '#ff4d4f'}">${(store.on_time_rate * 100).toFixed(0)}%</strong></p>
        <p>⏱ 平均配送时长：<strong>${store.avg_delivery_time || 23}</strong> 分钟</p>
        <p>⚠ 超时订单：<strong style="color: #ff4d4f">${store.timeout_orders || 40}</strong> 单</p>
      </div>
    </div>
  `

  const infoWindow = new AMap.InfoWindow({
    content: infoContent,
    offset: new AMap.Pixel(0, -30)
  })

  infoWindow.open(mapInstance, [store.lon, store.lat])
}

// 监听当前选中门店变化
watch(() => appStore.currentStoreId, (storeId) => {
  if (!mapInstance || !storeId) return
  
  const store = STORES.find(s => s.id === storeId)
  if (store) {
    mapInstance.setCenter([store.lon, store.lat])
    mapInstance.setZoom(14)
    showStoreInfo(store)
  }
})
</script>

<template>
  <div class="map-wrapper w-full h-full relative">
    <!-- 地图容器 -->
    <div ref="mapContainer" class="w-full h-full"></div>
    
    <!-- 加载状态 -->
    <div v-if="mapLoading" class="absolute inset-0 flex items-center justify-center bg-white/80">
      <div class="text-center">
        <div class="animate-spin w-8 h-8 border-4 border-jd-red border-t-transparent rounded-full mx-auto mb-2"></div>
        <p class="text-gray-500">地图加载中...</p>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="mapError" class="absolute inset-0 flex items-center justify-center bg-white">
      <div class="text-center">
        <p class="text-red-500 mb-2">{{ mapError }}</p>
        <button 
          @click="initMap" 
          class="px-4 py-2 bg-jd-red text-white rounded-lg hover:bg-red-600"
        >
          重试
        </button>
      </div>
    </div>

    <!-- 地图标题 -->
    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
      <h1 class="text-lg font-semibold text-gray-800">七鲜超市配送履约可视化</h1>
      <p class="text-xs text-gray-500">覆盖北京朝阳区 6 家门店</p>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  background: #f5f5f5;
}

/* 覆盖高德地图默认样式 */
:deep(.amap-logo),
:deep(.amap-copyright) {
  display: none !important;
}
</style>
