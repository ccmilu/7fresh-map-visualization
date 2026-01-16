<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES } from '@/data/stores'
import serviceAreasData from '@/data/serviceAreas.json'
import { generateHeatmapData, getAllTimeoutOrders, identifyTimeoutClusters } from '@/utils/mockData'
import type { TimeoutOrder } from '@/types'

const appStore = useAppStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const mapError = ref<string | null>(null)

// 地图实例
let mapInstance: any = null
let AMap: any = null

// 门店标记点
const storeMarkers: any[] = []

// 服务范围多边形
const serviceAreaPolygons: any[] = []

// 热力图相关
let heatmapLayer: any = null
let heatmapData: { lng: number; lat: number; count: number }[] = []

// 超时订单相关
const timeoutMarkers: any[] = []
const timeoutClusterCircles: any[] = []
let timeoutOrders: TimeoutOrder[] = []
let timeoutClusters: { center: { lat: number; lon: number }; count: number; radius: number }[] = []

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

    // 生成数据
    heatmapData = generateHeatmapData()
    timeoutOrders = getAllTimeoutOrders()
    timeoutClusters = identifyTimeoutClusters(timeoutOrders)
    
    // 添加服务范围多边形（先绘制，在底层）
    addServiceAreas()
    
    // 添加热力图（在服务范围上层）
    addHeatmapLayer()
    
    // 添加超时订单标记和聚集区域
    addTimeoutMarkers()
    addTimeoutClusters()
    
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

// 添加服务范围多边形
function addServiceAreas() {
  if (!AMap || !mapInstance) return
  
  // 清除现有多边形
  serviceAreaPolygons.forEach(p => mapInstance.remove(p))
  serviceAreaPolygons.length = 0
  
  // 绘制每个门店的服务范围
  serviceAreasData.areas.forEach((area: any) => {
    // 转换坐标格式 [{lon, lat}] -> [[lon, lat]]
    const path = area.polygon.map((p: any) => [p.lon, p.lat])
    
    if (path.length < 3) return
    
    const polygon = new AMap.Polygon({
      path: path,
      fillColor: area.color,
      fillOpacity: 0.15,
      strokeColor: area.color,
      strokeWeight: 2,
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
      zIndex: 10
    })
    
    // 悬停效果
    polygon.on('mouseover', () => {
      polygon.setOptions({
        fillOpacity: 0.3,
        strokeWeight: 3
      })
    })
    
    polygon.on('mouseout', () => {
      polygon.setOptions({
        fillOpacity: 0.15,
        strokeWeight: 2
      })
    })
    
    // 点击显示信息
    polygon.on('click', () => {
      const store = STORES.find(s => s.id === area.store_id)
      if (store) {
        showServiceAreaInfo(area, store)
      }
    })
    
    serviceAreaPolygons.push(polygon)
    mapInstance.add(polygon)
  })
}

// 显示服务范围信息
function showServiceAreaInfo(area: any, store: typeof STORES[0]) {
  if (!AMap || !mapInstance) return
  
  const infoContent = `
    <div style="
      padding: 14px;
      min-width: 220px;
      font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #F1F5F9;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: ${area.color};
          border-radius: 3px;
        "></div>
        <span style="font-size: 13px; font-weight: 600; color: #0F172A;">
          ${store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '')}
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">覆盖面积</span>
          <span style="font-size: 14px; font-weight: 600; color: #0F172A;">${area.area_sqkm} km²</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">日均单量</span>
          <span style="font-size: 14px; font-weight: 600; color: #0F172A;">${area.daily_orders} 单</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">订单密度</span>
          <span style="font-size: 14px; font-weight: 600; color: #0F172A;">${(area.daily_orders / area.area_sqkm).toFixed(1)} 单/km²</span>
        </div>
      </div>
    </div>
  `
  
  // 计算多边形中心点
  const center = calculatePolygonCenter(area.polygon)
  
  const infoWindow = new AMap.InfoWindow({
    content: infoContent,
    offset: new AMap.Pixel(0, 0)
  })
  
  infoWindow.open(mapInstance, center)
}

// 计算多边形中心点
function calculatePolygonCenter(polygon: Array<{lon: number, lat: number}>): [number, number] {
  let sumLon = 0, sumLat = 0
  const n = polygon.length
  
  for (const p of polygon) {
    sumLon += p.lon
    sumLat += p.lat
  }
  
  return [sumLon / n, sumLat / n]
}

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

// ==================== 热力图相关 ====================

// 添加热力图图层
async function addHeatmapLayer() {
  if (!AMap || !mapInstance) return
  
  try {
    // 动态加载热力图插件
    await new Promise<void>((resolve, reject) => {
      AMap.plugin('AMap.HeatMap', () => {
        resolve()
      })
    })
    
    // 创建热力图实例
    heatmapLayer = new AMap.HeatMap(mapInstance, {
      radius: 28, // 热力点半径稍大
      opacity: [0, 0.85], // 透明度更高
      gradient: {
        0.2: '#3B82F6',  // 蓝色（低密度）
        0.4: '#10B981',  // 绿色
        0.6: '#FBBF24',  // 黄色（中密度）
        0.8: '#F97316',  // 橙色
        1.0: '#EF4444'   // 红色（高密度）
      },
      zooms: [3, 18],
      zIndex: 20
    })
    
    // 设置数据 - 降低max值让颜色分布更明显
    heatmapLayer.setDataSet({
      data: heatmapData,
      max: 15 // 降低最大值，让中等权重也能显示明显颜色
    })
    
    // 根据初始图层状态显示/隐藏
    if (!appStore.visibleLayers.includes('heatmap')) {
      heatmapLayer.hide()
    }
  } catch (error) {
    console.error('热力图加载失败:', error)
  }
}

// ==================== 超时订单相关 ====================

// 添加超时订单标记点
function addTimeoutMarkers() {
  if (!AMap || !mapInstance) return
  
  // 清除现有标记
  timeoutMarkers.forEach(m => mapInstance.remove(m))
  timeoutMarkers.length = 0
  
  for (const order of timeoutOrders) {
    // 创建红色圆点标记
    const markerContent = `
      <div class="timeout-marker" style="
        width: 12px;
        height: 12px;
        background: #EF4444;
        border: 2px solid #FCA5A5;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        animation: pulse 2s infinite;
      "></div>
    `
    
    const marker = new AMap.Marker({
      position: [order.lon, order.lat],
      content: markerContent,
      offset: new AMap.Pixel(-6, -6),
      zIndex: 30,
      extData: order
    })
    
    // 点击显示超时详情
    marker.on('click', () => {
      showTimeoutOrderInfo(order)
    })
    
    timeoutMarkers.push(marker)
    mapInstance.add(marker)
  }
  
  // 根据初始图层状态显示/隐藏
  if (!appStore.visibleLayers.includes('timeout')) {
    timeoutMarkers.forEach(m => m.hide())
  }
}

// 显示超时订单信息
function showTimeoutOrderInfo(order: TimeoutOrder) {
  if (!AMap || !mapInstance) return
  
  const infoContent = `
    <div style="
      padding: 14px;
      min-width: 200px;
      font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #FEE2E2;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: #FEF2F2;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        <span style="font-size: 13px; font-weight: 600; color: #EF4444;">超时订单</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">配送时长</span>
          <span style="font-size: 14px; font-weight: 600; color: #0F172A;">${order.duration} 分钟</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">超时时长</span>
          <span style="font-size: 14px; font-weight: 600; color: #EF4444;">+${order.timeout_duration} 分钟</span>
        </div>
        <div style="
          margin-top: 4px;
          padding: 8px 10px;
          background: #FEF2F2;
          border-radius: 6px;
          border: 1px solid #FECACA;
        ">
          <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">超时原因</div>
          <div style="font-size: 12px; color: #EF4444; font-weight: 500;">${order.reason}</div>
        </div>
      </div>
    </div>
  `
  
  const infoWindow = new AMap.InfoWindow({
    content: infoContent,
    offset: new AMap.Pixel(0, -10)
  })
  
  infoWindow.open(mapInstance, [order.lon, order.lat])
}

// 添加超时订单聚集区域
function addTimeoutClusters() {
  if (!AMap || !mapInstance) return
  
  // 清除现有聚集区域
  timeoutClusterCircles.forEach(c => mapInstance.remove(c))
  timeoutClusterCircles.length = 0
  
  for (const cluster of timeoutClusters) {
    // 创建半透明红色圆形区域
    const circle = new AMap.Circle({
      center: [cluster.center.lon, cluster.center.lat],
      radius: cluster.radius, // 半径（米）
      fillColor: '#EF4444',
      fillOpacity: 0.15,
      strokeColor: '#EF4444',
      strokeWeight: 2,
      strokeOpacity: 0.6,
      strokeStyle: 'dashed',
      zIndex: 25
    })
    
    // 悬停效果
    circle.on('mouseover', () => {
      circle.setOptions({
        fillOpacity: 0.25,
        strokeWeight: 3
      })
    })
    
    circle.on('mouseout', () => {
      circle.setOptions({
        fillOpacity: 0.15,
        strokeWeight: 2
      })
    })
    
    // 点击显示聚集区域信息
    circle.on('click', () => {
      showClusterInfo(cluster)
    })
    
    timeoutClusterCircles.push(circle)
    mapInstance.add(circle)
  }
  
  // 根据初始图层状态显示/隐藏
  if (!appStore.visibleLayers.includes('timeout')) {
    timeoutClusterCircles.forEach(c => c.hide())
  }
}

// 显示聚集区域信息
function showClusterInfo(cluster: { center: { lat: number; lon: number }; count: number; radius: number }) {
  if (!AMap || !mapInstance) return
  
  const infoContent = `
    <div style="
      padding: 14px;
      min-width: 220px;
      font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #FEE2E2;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: #EF4444;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <span style="font-size: 13px; font-weight: 600; color: #EF4444;">配送黑洞区域</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">超时订单数</span>
          <span style="font-size: 14px; font-weight: 600; color: #EF4444;">${cluster.count} 单</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #64748B;">影响半径</span>
          <span style="font-size: 14px; font-weight: 600; color: #0F172A;">${cluster.radius} 米</span>
        </div>
        <div style="
          margin-top: 6px;
          padding: 10px;
          background: linear-gradient(135deg, #FEF2F2, #FFF1F2);
          border-radius: 8px;
          border: 1px solid #FECACA;
        ">
          <div style="font-size: 11px; color: #DC2626; font-weight: 600; margin-bottom: 4px;">⚠ 需要关注</div>
          <div style="font-size: 11px; color: #7F1D1D; line-height: 1.5;">
            该区域超时订单聚集，建议：<br/>
            • 排查门禁/电梯等末端配送问题<br/>
            • 考虑与物业协商改善通行条件
          </div>
        </div>
      </div>
    </div>
  `
  
  const infoWindow = new AMap.InfoWindow({
    content: infoContent,
    offset: new AMap.Pixel(0, 0)
  })
  
  infoWindow.open(mapInstance, [cluster.center.lon, cluster.center.lat])
}

// ==================== 图层监听 ====================

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

// 监听图层可见性变化
watch(() => appStore.visibleLayers, (layers) => {
  if (!mapInstance) return
  
  // 门店标记
  const showStores = layers.includes('stores')
  storeMarkers.forEach(m => showStores ? m.show() : m.hide())
  
  // 服务范围
  const showServiceArea = layers.includes('serviceArea')
  if (showServiceArea && serviceAreaPolygons.length === 0) {
    addServiceAreas()
  } else {
    serviceAreaPolygons.forEach(p => showServiceArea ? p.show() : p.hide())
  }
  
  // 热力图
  const showHeatmap = layers.includes('heatmap')
  if (heatmapLayer) {
    showHeatmap ? heatmapLayer.show() : heatmapLayer.hide()
  }
  
  // 超时订单
  const showTimeout = layers.includes('timeout')
  timeoutMarkers.forEach(m => showTimeout ? m.show() : m.hide())
  timeoutClusterCircles.forEach(c => showTimeout ? c.show() : c.hide())
  
}, { deep: true })
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

/* 超时订单脉冲动画 */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
}

:deep(.timeout-marker) {
  animation: pulse 2s infinite;
}
</style>
