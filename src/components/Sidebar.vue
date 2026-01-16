<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES, getSummaryData } from '@/data/stores'
import { generateInsights } from '@/utils/mockData'
import type { LayerType } from '@/types'

const appStore = useAppStore()
const summaryData = getSummaryData()
const insights = generateInsights()

// 图层配置
const layerConfig: { key: LayerType; label: string; icon: string }[] = [
  { key: 'stores', label: '门店位置', icon: '🏪' },
  { key: 'serviceArea', label: '服务覆盖范围', icon: '📍' },
  { key: 'heatmap', label: '订单热力图', icon: '🔥' },
  { key: 'timeout', label: '超时订单预警', icon: '⚠️' },
  { key: 'route', label: '配送路径分析', icon: '🛵' }
]

// 当前选中的门店
const selectedStore = computed(() => {
  return appStore.currentStore
})

// 获取准时率颜色
function getOnTimeRateColor(rate: number): string {
  if (rate >= 0.92) return 'text-green-500'
  if (rate >= 0.88) return 'text-yellow-500'
  return 'text-red-500'
}

// 获取洞察图标
function getInsightIcon(type: string): string {
  switch (type) {
    case 'warning': return '⚠️'
    case 'success': return '✓'
    case 'suggestion': return '💡'
    default: return '📌'
  }
}

// 获取洞察样式
function getInsightClass(type: string): string {
  switch (type) {
    case 'warning': return 'bg-red-50 border-red-200'
    case 'success': return 'bg-green-50 border-green-200'
    case 'suggestion': return 'bg-blue-50 border-blue-200'
    default: return 'bg-gray-50 border-gray-200'
  }
}
</script>

<template>
  <div class="sidebar h-full bg-white shadow-lg flex flex-col">
    <!-- 标题 -->
    <div class="header px-4 py-3 border-b bg-gradient-to-r from-jd-red to-jd-orange">
      <h2 class="text-white font-semibold">配送数据面板</h2>
    </div>

    <!-- 滚动区域 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 数据总览 -->
      <section class="p-4 border-b">
        <h3 class="text-sm font-medium text-gray-500 mb-3">数据总览</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card bg-blue-50 rounded-lg p-3">
            <div class="text-2xl font-bold text-blue-600">{{ summaryData.storeCount }}</div>
            <div class="text-xs text-gray-500">🏪 覆盖门店</div>
          </div>
          <div class="stat-card bg-purple-50 rounded-lg p-3">
            <div class="text-2xl font-bold text-purple-600">{{ summaryData.totalOrders.toLocaleString() }}</div>
            <div class="text-xs text-gray-500">📦 日均单量</div>
          </div>
          <div class="stat-card bg-green-50 rounded-lg p-3">
            <div class="text-2xl font-bold text-green-600">{{ (summaryData.avgOnTimeRate * 100).toFixed(0) }}%</div>
            <div class="text-xs text-gray-500">✓ 准时率</div>
          </div>
          <div class="stat-card bg-orange-50 rounded-lg p-3">
            <div class="text-2xl font-bold text-orange-600">{{ summaryData.warningCount }}</div>
            <div class="text-xs text-gray-500">⚠ 预警区域</div>
          </div>
        </div>
      </section>

      <!-- 图层控制 -->
      <section class="p-4 border-b">
        <h3 class="text-sm font-medium text-gray-500 mb-3">图层控制</h3>
        <div class="space-y-2">
          <label
            v-for="layer in layerConfig"
            :key="layer.key"
            class="flex items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5"
          >
            <input
              type="checkbox"
              :checked="appStore.visibleLayers.includes(layer.key)"
              @change="appStore.toggleLayer(layer.key)"
              class="w-4 h-4 text-jd-red rounded border-gray-300 focus:ring-jd-red"
            />
            <span class="ml-2 text-sm">{{ layer.icon }} {{ layer.label }}</span>
          </label>
        </div>
      </section>

      <!-- 门店列表 -->
      <section class="p-4 border-b">
        <h3 class="text-sm font-medium text-gray-500 mb-3">门店列表</h3>
        <div class="space-y-2">
          <div
            v-for="store in STORES"
            :key="store.id"
            @click="appStore.selectStore(store.id)"
            :class="[
              'store-card p-3 rounded-lg border cursor-pointer transition-all',
              selectedStore?.id === store.id 
                ? 'border-jd-red bg-red-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-800 truncate">
                  {{ store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '') }}
                </h4>
                <div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>📦 {{ store.daily_orders }}单</span>
                  <span :class="getOnTimeRateColor(store.on_time_rate)">
                    ✓ {{ (store.on_time_rate * 100).toFixed(0) }}%
                  </span>
                </div>
              </div>
              <button 
                class="ml-2 text-gray-400 hover:text-jd-red"
                title="定位"
              >
                📍
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 洞察建议 -->
      <section class="p-4">
        <h3 class="text-sm font-medium text-gray-500 mb-3">洞察建议</h3>
        <div class="space-y-2">
          <div
            v-for="insight in insights"
            :key="insight.id"
            :class="['insight-card p-3 rounded-lg border', getInsightClass(insight.type)]"
          >
            <div class="flex items-start gap-2">
              <span class="text-lg">{{ getInsightIcon(insight.type) }}</span>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-800">{{ insight.title }}</h4>
                <p class="text-xs text-gray-600 mt-1">{{ insight.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部操作 -->
    <div class="p-4 border-t bg-gray-50">
      <button
        @click="appStore.resetState()"
        class="w-full py-2 text-sm text-gray-600 hover:text-jd-red transition-colors"
      >
        🔄 重置视图
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  font-size: 14px;
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.store-card {
  transition: all 0.2s;
}

.insight-card {
  transition: all 0.2s;
}

.insight-card:hover {
  transform: translateX(4px);
}
</style>
