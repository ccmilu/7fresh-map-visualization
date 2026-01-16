import { ref, shallowRef, onUnmounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

// 高德地图Key
const AMAP_KEY = '71beb60258a28988aa531f25c1adc9c0'
const AMAP_VERSION = '2.0'

export function useMap(containerId: string) {
  const mapInstance = shallowRef<any>(null)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)

  // 初始化地图
  const initMap = async (options?: {
    center?: [number, number]
    zoom?: number
  }) => {
    try {
      const AMap = await AMapLoader.load({
        key: AMAP_KEY,
        version: AMAP_VERSION,
        plugins: [
          'AMap.Scale',
          'AMap.ToolBar',
          'AMap.HeatMap',
          'AMap.MarkerCluster'
        ]
      })

      mapInstance.value = new AMap.Map(containerId, {
        viewMode: '2D',
        zoom: options?.zoom ?? 12,
        center: options?.center ?? [116.497, 39.944], // 默认北京朝阳区
        mapStyle: 'amap://styles/light', // 浅色主题
        resizeEnable: true
      })

      // 添加控件
      mapInstance.value.addControl(new AMap.Scale())
      mapInstance.value.addControl(new AMap.ToolBar({
        position: 'LT'
      }))

      isLoaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '地图加载失败'
      console.error('地图初始化失败:', e)
    }
  }

  // 定位到指定位置
  const panTo = (lng: number, lat: number, zoom?: number) => {
    if (!mapInstance.value) return
    mapInstance.value.setCenter([lng, lat])
    if (zoom) {
      mapInstance.value.setZoom(zoom)
    }
  }

  // 添加标记点
  const addMarker = (options: {
    position: [number, number]
    title?: string
    icon?: string
    content?: string
    onClick?: () => void
  }) => {
    if (!mapInstance.value) return null

    const marker = new (window as any).AMap.Marker({
      position: options.position,
      title: options.title,
      icon: options.icon,
      content: options.content
    })

    if (options.onClick) {
      marker.on('click', options.onClick)
    }

    mapInstance.value.add(marker)
    return marker
  }

  // 添加多边形
  const addPolygon = (options: {
    path: [number, number][]
    fillColor?: string
    fillOpacity?: number
    strokeColor?: string
    strokeWeight?: number
    onClick?: () => void
  }) => {
    if (!mapInstance.value) return null

    const polygon = new (window as any).AMap.Polygon({
      path: options.path,
      fillColor: options.fillColor ?? '#1890ff',
      fillOpacity: options.fillOpacity ?? 0.3,
      strokeColor: options.strokeColor ?? '#1890ff',
      strokeWeight: options.strokeWeight ?? 2
    })

    if (options.onClick) {
      polygon.on('click', options.onClick)
    }

    mapInstance.value.add(polygon)
    return polygon
  }

  // 清除所有覆盖物
  const clearOverlays = () => {
    if (mapInstance.value) {
      mapInstance.value.clearMap()
    }
  }

  // 销毁地图
  const destroyMap = () => {
    if (mapInstance.value) {
      mapInstance.value.destroy()
      mapInstance.value = null
      isLoaded.value = false
    }
  }

  onUnmounted(() => {
    destroyMap()
  })

  return {
    mapInstance,
    isLoaded,
    error,
    initMap,
    panTo,
    addMarker,
    addPolygon,
    clearOverlays,
    destroyMap
  }
}
