import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LayerType, Store } from '@/types'
import { STORES } from '@/data/stores'

export const useAppStore = defineStore('app', () => {
  // 状态
  const currentStoreId = ref<number | null>(null)
  const visibleLayers = ref<LayerType[]>(['stores', 'serviceArea', 'heatmap', 'timeout'])
  const selectedTripId = ref<string | null>(null)

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
      // 联动规则：关闭服务范围时自动关闭热力图
      if (layer === 'serviceArea' && visibleLayers.value.includes('heatmap')) {
        visibleLayers.value.splice(visibleLayers.value.indexOf('heatmap'), 1)
      }
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
  }

  return {
    // 状态
    currentStoreId,
    visibleLayers,
    selectedTripId,
    // 计算属性
    currentStore,
    isLayerVisible,
    // 方法
    selectStore,
    toggleLayer,
    setLayer,
    selectTrip,
    resetState
  }
})
