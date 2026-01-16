import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LayerType, Store, DeliveryTrip } from '@/types'
import { STORES } from '@/data/stores'
import { generateDeliveryTrips } from '@/utils/mockData'

export const useAppStore = defineStore('app', () => {
  // 状态
  const currentStoreId = ref<number | null>(null)
  const visibleLayers = ref<LayerType[]>(['stores', 'serviceArea', 'heatmap', 'timeout'])
  const selectedTripId = ref<string | null>(null)
  const heatmapStoreId = ref<number | null>(null) // null 表示显示所有门店热力图
  const routeStoreId = ref<number>(1) // 路径分析的门店ID
  const deliveryTrips = ref<DeliveryTrip[]>(generateDeliveryTrips(1, 5)) // 配送行程数据
  const resetVersion = ref(0) // 视图重置触发器

  // 计算属性
  const currentStore = computed<Store | null>(() => {
    if (currentStoreId.value === null) return null
    return STORES.find(s => s.id === currentStoreId.value) || null
  })

  const isLayerVisible = computed(() => (layer: LayerType) => {
    return visibleLayers.value.includes(layer)
  })

  // 方法
  const selectStore = (storeId: number | null) => {
    currentStoreId.value = storeId
  }

  const toggleLayer = (layer: LayerType) => {
    const index = visibleLayers.value.indexOf(layer)
    if (index > -1) {
      visibleLayers.value.splice(index, 1)
    } else {
      // 打开路径分析时关闭其他图层
      if (layer === 'route') {
        visibleLayers.value = ['stores', 'route']
      } else {
        visibleLayers.value.push(layer)
      }
    }
  }

  const setLayer = (layer: LayerType, visible: boolean) => {
    const index = visibleLayers.value.indexOf(layer)
    if (visible && index === -1) {
      visibleLayers.value.push(layer)
    } else if (!visible && index > -1) {
      visibleLayers.value.splice(index, 1)
    }
  }

  const selectTrip = (tripId: string | null) => {
    selectedTripId.value = tripId
    if (tripId) {
      visibleLayers.value = ['stores', 'route']
    }
  }

  const resetState = () => {
    currentStoreId.value = null
    visibleLayers.value = ['stores', 'serviceArea', 'heatmap', 'timeout']
    selectedTripId.value = null
    heatmapStoreId.value = null
    routeStoreId.value = 1
    deliveryTrips.value = generateDeliveryTrips(1, 5)
    resetVersion.value++
  }

  // 设置热力图显示的门店
  const setHeatmapStore = (storeId: number | null) => {
    heatmapStoreId.value = storeId
  }

  // 设置路径分析的门店
  const setRouteStore = (storeId: number) => {
    routeStoreId.value = storeId
    deliveryTrips.value = generateDeliveryTrips(storeId, 5)
    selectedTripId.value = null
  }

  // 获取选中的行程数据
  const selectedTrip = computed<DeliveryTrip | null>(() => {
    if (!selectedTripId.value) return null
    return deliveryTrips.value.find(t => t.trip_id === selectedTripId.value) || null
  })

  return {
    // 状态
    currentStoreId,
    visibleLayers,
    selectedTripId,
    heatmapStoreId,
    routeStoreId,
    deliveryTrips,
    resetVersion,
    // 计算属性
    currentStore,
    isLayerVisible,
    selectedTrip,
    // 方法
    selectStore,
    toggleLayer,
    setLayer,
    selectTrip,
    resetState,
    setHeatmapStore,
    setRouteStore
  }
})
