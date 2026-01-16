<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES } from '@/data/stores'
import { generateVoronoiAreas, toAMapPath } from '@/utils/voronoi'
import { generateHeatmapData, getAllTimeoutOrders, identifyTimeoutClusters } from '@/utils/mockData'

const appStore = useAppStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const mapError = ref<string | null>(null)

// 地图实例
let mapInstance: any = null
let AMap: any = null

// 覆盖物引用
const storeMarkers: any[] = []
const voronoiPolygons: any[] = []
let heatmapLayer: any = null
const timeoutMarkers: any[] = []
const clusterCircles: any[] = []

// 预生成数据（避免重复计算）
const heatmapData = generateHeatmapData()
const timeoutOrders = getAllTimeoutOrders()
const timeoutClusters = identifyTimeoutClusters(timeoutOrders)

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

    // 添加图层
    addStoreMarkers()
    addVoronoiLayer()
    addHeatmapLayer()
    addTimeoutLayer()

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
    // 根据准时率获取颜色
    const rate = store.on_time_rate * 100
    const bgColor = getOnTimeBgColor(rate)
    const borderColor = getOnTimeBorderColor(rate)
    const iconBgColor = getOnTimeColor(rate)
    
    // 创建自定义标记内容 - 根据准时率显示不同背景色
    const markerContent = `
      <div class="store-marker" style="
        display: flex;
        align-items: center;
        gap: 6px;
        background: ${bgColor};
        color: #0F172A;
        padding: 8px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06);
        cursor: pointer;
        transform: translateX(-50%);
        border: 2px solid ${borderColor};
        transition: all 0.2s ease;
      ">
        <span style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: ${iconBgColor};
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

// 获取准时率对应的颜色
const getOnTimeColor = (rate: number) => {
  if (rate >= 90) return '#22C55E'
  if (rate >= 85) return '#F59E0B'
  return '#EF4444'
}

// 获取准时率对应的背景色（用于标记点）
const getOnTimeBgColor = (rate: number) => {
  if (rate >= 90) return '#DCFCE7' // 浅绿
  if (rate >= 85) return '#FEF3C7' // 浅黄
  return '#FEE2E2' // 浅红
}

// 获取准时率对应的边框色
const getOnTimeBorderColor = (rate: number) => {
  if (rate >= 90) return '#86EFAC'
  if (rate >= 85) return '#FCD34D'
  return '#FCA5A5'
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

// ============== 泰森多边形图层 ==============
const VORONOI_COLORS = [
  { fill: '#3B82F6', stroke: '#2563EB' },  // 蓝
  { fill: '#10B981', stroke: '#059669' },  // 绿
  { fill: '#F59E0B', stroke: '#D97706' },  // 黄
  { fill: '#EF4444', stroke: '#DC2626' },  // 红
  { fill: '#8B5CF6', stroke: '#7C3AED' },  // 紫
  { fill: '#EC4899', stroke: '#DB2777' }   // 粉
]

function addVoronoiLayer() {
  if (!AMap || !mapInstance) return
  
  // 清除现有多边形
  voronoiPolygons.forEach(p => mapInstance.remove(p))
  voronoiPolygons.length = 0
  
  // 生成泰森多边形
  const areas = generateVoronoiAreas(STORES)
  
  areas.forEach((area, index) => {
    const store = STORES.find(s => s.id === area.store_id)
    const color = VORONOI_COLORS[index % VORONOI_COLORS.length]!
    
    const polygon = new AMap.Polygon({
      path: toAMapPath(area.polygon),
      fillColor: color.fill,
      fillOpacity: 0.15,
      strokeColor: color.stroke,
      strokeWeight: 2,
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    })
    
    // 添加点击事件
    polygon.on('click', () => {
      if (store) {
        appStore.selectStore(store.id)
        showStoreInfo(store)
      }
    })
    
    // 鼠标悬停高亮
    polygon.on('mouseover', () => {
      polygon.setOptions({ fillOpacity: 0.3 })
    })
    polygon.on('mouseout', () => {
      polygon.setOptions({ fillOpacity: 0.15 })
    })
    
    voronoiPolygons.push(polygon)
  })
  
  // 根据初始可见性添加到地图
  if (appStore.visibleLayers.includes('serviceArea')) {
    voronoiPolygons.forEach(p => mapInstance.add(p))
  }
}

// ============== 热力图图层 ==============
function addHeatmapLayer() {
  if (!AMap || !mapInstance) return
  
  // 创建热力图实例
  mapInstance.plugin(['AMap.HeatMap'], () => {
    heatmapLayer = new AMap.HeatMap(mapInstance, {
      radius: 25,
      opacity: [0, 0.8],
      gradient: {
        0.4: '#2563EB',
        0.6: '#10B981', 
        0.8: '#F59E0B',
        1.0: '#EF4444'
      }
    })
    
    // 设置数据
    heatmapLayer.setDataSet({
      data: heatmapData,
      max: 10
    })
    
    // 根据初始可见性显示
    if (appStore.visibleLayers.includes('heatmap')) {
      heatmapLayer.show()
    } else {
      heatmapLayer.hide()
    }
  })
}

// ============== 超时订单图层 ==============
function addTimeoutLayer() {
  if (!AMap || !mapInstance) return
  
  // 清除现有标记
  timeoutMarkers.forEach(m => mapInstance.remove(m))
  timeoutMarkers.length = 0
  clusterCircles.forEach(c => mapInstance.remove(c))
  clusterCircles.length = 0
  
  // 超时订单小红点
  timeoutOrders.forEach(order => {
    const marker = new AMap.CircleMarker({
      center: [order.lon, order.lat],
      radius: 4,
      fillColor: '#EF4444',
      fillOpacity: 0.7,
      strokeColor: '#DC2626',
      strokeWeight: 1
    })
    
    marker.on('click', () => {
      const infoContent = `
        <div style="padding: 12px; min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; color: #EF4444; margin-bottom: 8px;">⚠️ 超时订单</div>
          <div style="font-size: 12px; color: #64748B;">
            <p style="margin: 4px 0;">配送时长: <span style="color: #0F172A; font-weight: 500;">${order.duration}分钟</span></p>
            <p style="margin: 4px 0;">超时: <span style="color: #EF4444; font-weight: 500;">${order.timeout_duration}分钟</span></p>
            <p style="margin: 4px 0;">原因: <span style="color: #0F172A;">${order.reason}</span></p>
          </div>
        </div>
      `
      const infoWindow = new AMap.InfoWindow({
        content: infoContent,
        offset: new AMap.Pixel(0, -10)
      })
      infoWindow.open(mapInstance, [order.lon, order.lat])
    })
    
    timeoutMarkers.push(marker)
  })
  
  // 聚集区域圆圈
  timeoutClusters.forEach(cluster => {
    const circle = new AMap.Circle({
      center: [cluster.center.lon, cluster.center.lat],
      radius: cluster.radius,
      fillColor: '#EF4444',
      fillOpacity: 0.15,
      strokeColor: '#EF4444',
      strokeWeight: 2,
      strokeStyle: 'dashed'
    })
    
    // 添加聚集区域标签
    const label = new AMap.Marker({
      position: [cluster.center.lon, cluster.center.lat],
      content: `<div style="
        background: #FEF2F2;
        border: 1px solid #FECACA;
        color: #EF4444;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      ">⚠️ ${cluster.count}单超时</div>`,
      offset: new AMap.Pixel(-40, -12)
    })
    
    clusterCircles.push(circle, label)
  })
  
  // 根据初始可见性添加到地图
  if (appStore.visibleLayers.includes('timeout')) {
    timeoutMarkers.forEach(m => mapInstance.add(m))
    clusterCircles.forEach(c => mapInstance.add(c))
  }
}

// ============== 图层可见性监听 ==============
watch(() => appStore.visibleLayers, (layers) => {
  if (!mapInstance) return
  
  // 门店标记
  storeMarkers.forEach(m => {
    if (layers.includes('stores')) {
      mapInstance.add(m)
    } else {
      mapInstance.remove(m)
    }
  })
  
  // 泰森多边形
  voronoiPolygons.forEach(p => {
    if (layers.includes('serviceArea')) {
      mapInstance.add(p)
    } else {
      mapInstance.remove(p)
    }
  })
  
  // 热力图
  if (heatmapLayer) {
    if (layers.includes('heatmap')) {
      heatmapLayer.show()
    } else {
      heatmapLayer.hide()
    }
  }
  
  // 超时订单
  timeoutMarkers.forEach(m => {
    if (layers.includes('timeout')) {
      mapInstance.add(m)
    } else {
      mapInstance.remove(m)
    }
  })
  clusterCircles.forEach(c => {
    if (layers.includes('timeout')) {
      mapInstance.add(c)
    } else {
      mapInstance.remove(c)
    }
  })
}, { deep: true })

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

    <!-- 地图标题卡片 - 移动端简化 -->
    <div class="absolute top-3 left-3 lg:top-4 lg:left-4 bg-surface/95 backdrop-blur-sm px-3 py-2 lg:px-5 lg:py-3 rounded-xl shadow-panel border border-border-light">
      <div class="flex items-center gap-2 lg:gap-3">
        <div class="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-jd-red flex items-center justify-center">
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

    <!-- 图例 - 移动端底部居中，桌面端右下角 -->
    <div class="absolute bottom-20 left-1/2 -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-[416px] lg:translate-x-0 bg-surface/95 backdrop-blur-sm px-3 py-2 lg:px-4 lg:py-3 rounded-xl shadow-card border border-border-light">
      <div class="flex items-center gap-2 lg:gap-4 text-xs">
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
