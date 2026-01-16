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
      key: '71beb60258a28988aa531f25c1adc9c0',
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

// 门店图标 SVG
const storeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`

// 添加门店标记点
function addStoreMarkers() {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  storeMarkers.forEach(m => mapInstance.remove(m))
  storeMarkers.length = 0

  STORES.forEach(store => {
    // 创建自定义标记内容 - 现代简约风格
    const markerContent = `
      <div class="store-marker" style="
        display: flex;
        align-items: center;
        gap: 6px;
        background: #FFFFFF;
        color: #0F172A;
        padding: 8px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
        cursor: pointer;
        transform: translateX(-50%);
        border: 1px solid #E2E8F0;
        transition: all 0.2s ease;
      ">
        <span style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #E2231A;
          border-radius: 6px;
          color: white;
        ">${storeIconSvg}</span>
        <span>${store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '')}</span>
      </div>
    `

    const marker = new AMap.Marker({
      position: [store.lon, store.lat],
      content: markerContent,
      offset: new AMap.Pixel(0, -24),
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

// 获取准时率颜色
function getOnTimeRateColor(rate: number): string {
  if (rate >= 0.9) return '#10B981'
  if (rate >= 0.85) return '#F59E0B'
  return '#EF4444'
}

// 显示门店信息窗口
function showStoreInfo(store: typeof STORES[0]) {
  if (!AMap || !mapInstance) return

  const onTimeColor = getOnTimeRateColor(store.on_time_rate)

  const infoContent = `
    <div style="
      padding: 16px;
      min-width: 260px;
      font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        padding-bottom: 12px;
        border-bottom: 1px solid #F1F5F9;
      ">
        <div style="
          width: 36px;
          height: 36px;
          background: #E2231A;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">${storeIconSvg}</div>
        <div>
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #0F172A;">${store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '')}</h3>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #94A3B8;">七鲜超市</p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="
          background: #F8FAFC;
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #F1F5F9;
        ">
          <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">日均单量</div>
          <div style="font-size: 18px; font-weight: 700; color: #0F172A;">${store.daily_orders}<span style="font-size: 12px; font-weight: 400; color: #94A3B8; margin-left: 2px;">单</span></div>
        </div>
        <div style="
          background: #F8FAFC;
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #F1F5F9;
        ">
          <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">准时率</div>
          <div style="font-size: 18px; font-weight: 700; color: ${onTimeColor};">${(store.on_time_rate * 100).toFixed(0)}%</div>
        </div>
        <div style="
          background: #F8FAFC;
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #F1F5F9;
        ">
          <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">平均时长</div>
          <div style="font-size: 18px; font-weight: 700; color: #0F172A;">${store.avg_delivery_time || 23}<span style="font-size: 12px; font-weight: 400; color: #94A3B8; margin-left: 2px;">分钟</span></div>
        </div>
        <div style="
          background: #FEF2F2;
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #FECACA;
        ">
          <div style="font-size: 11px; color: #EF4444; margin-bottom: 4px;">超时订单</div>
          <div style="font-size: 18px; font-weight: 700; color: #EF4444;">${store.timeout_orders || 40}<span style="font-size: 12px; font-weight: 400; color: #F87171; margin-left: 2px;">单</span></div>
        </div>
      </div>
    </div>
  `

  const infoWindow = new AMap.InfoWindow({
    content: infoContent,
    offset: new AMap.Pixel(0, -34)
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
  <div class="map-wrapper w-full h-full relative bg-surface-secondary">
    <!-- 地图容器 -->
    <div ref="mapContainer" class="w-full h-full"></div>
    
    <!-- 加载状态 -->
    <div v-if="mapLoading" class="absolute inset-0 flex items-center justify-center bg-surface/90 backdrop-blur-sm">
      <div class="text-center">
        <div class="relative w-12 h-12 mx-auto mb-3">
          <div class="absolute inset-0 rounded-full border-4 border-border"></div>
          <div class="absolute inset-0 rounded-full border-4 border-jd-red border-t-transparent animate-spin"></div>
        </div>
        <p class="text-text-secondary text-sm">地图加载中...</p>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="mapError" class="absolute inset-0 flex items-center justify-center bg-surface">
      <div class="text-center p-6 bg-surface rounded-2xl shadow-panel border border-border max-w-sm">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg class="w-6 h-6 text-status-danger" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
          </svg>
        </div>
        <p class="text-text-primary font-medium mb-1">加载失败</p>
        <p class="text-text-tertiary text-sm mb-4">{{ mapError }}</p>
        <button 
          @click="initMap" 
          class="px-5 py-2.5 bg-jd-red text-white text-sm font-medium rounded-lg hover:bg-jd-red-dark transition-colors"
        >
          重新加载
        </button>
      </div>
    </div>

    <!-- 地图标题卡片 -->
    <div class="absolute top-4 left-4 bg-surface/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-panel border border-border-light">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-jd-red flex items-center justify-center">
          <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <h1 class="text-base font-semibold text-text-primary">七鲜超市配送履约可视化</h1>
          <p class="text-xs text-text-tertiary mt-0.5">覆盖北京朝阳区 6 家门店</p>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="absolute bottom-6 left-4 bg-surface/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-card border border-border-light">
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-status-success"></span>
          <span class="text-text-secondary">准时率 ≥90%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-status-warning"></span>
          <span class="text-text-secondary">85-90%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-status-danger"></span>
          <span class="text-text-secondary">&lt;85%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 覆盖高德地图默认样式 */
:deep(.amap-logo),
:deep(.amap-copyright) {
  display: none !important;
}

:deep(.amap-info-content) {
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid #E2E8F0 !important;
}

:deep(.amap-info-sharp) {
  display: none !important;
}

:deep(.amap-info-close) {
  top: 12px !important;
  right: 12px !important;
  width: 24px !important;
  height: 24px !important;
  font-size: 16px !important;
  color: #94A3B8 !important;
}

:deep(.amap-info-close:hover) {
  color: #E2231A !important;
}
</style>
