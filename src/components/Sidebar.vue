<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES, getSummaryData } from '@/data/stores'
import { generateInsights } from '@/utils/mockData'
import type { LayerType } from '@/types'
import Icon from './icons/Icon.vue'

const appStore = useAppStore()
const summaryData = getSummaryData()
const insights = generateInsights()

// 图层配置
const layerConfig: { key: LayerType; label: string; icon: string }[] = [
  { key: 'stores', label: '门店位置', icon: 'store' },
  { key: 'serviceArea', label: '服务覆盖范围', icon: 'target' },
  { key: 'heatmap', label: '订单热力图', icon: 'flame' },
  { key: 'timeout', label: '超时订单预警', icon: 'alertTriangle' },
  { key: 'route', label: '配送路径分析', icon: 'route' }
]

// 当前选中的门店
const selectedStore = computed(() => {
  return appStore.currentStore
})

// 获取准时率颜色
function getOnTimeRateColor(rate: number): string {
  if (rate >= 0.92) return 'text-status-success'
  if (rate >= 0.88) return 'text-status-warning'
  return 'text-status-danger'
}

// 获取洞察样式
function getInsightClass(type: string): string {
  switch (type) {
    case 'warning': return 'bg-red-50 border-red-100'
    case 'success': return 'bg-emerald-50 border-emerald-100'
    case 'suggestion': return 'bg-blue-50 border-blue-100'
    default: return 'bg-surface-tertiary border-border-light'
  }
}

function getInsightIconColor(type: string): string {
  switch (type) {
    case 'warning': return 'text-status-danger'
    case 'success': return 'text-status-success'
    case 'suggestion': return 'text-status-info'
    default: return 'text-text-secondary'
  }
}
</script>

<template>
  <div class="sidebar h-full bg-surface flex flex-col border-l border-border">
    <!-- 标题 -->
    <div class="header px-5 py-4 border-b border-border bg-surface">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-jd-red flex items-center justify-center">
          <Icon name="store" class="text-white w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-text-primary">七鲜配送数据</h2>
          <p class="text-xs text-text-tertiary">实时监控面板</p>
        </div>
      </div>
    </div>

    <!-- 滚动区域 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 数据总览 -->
      <section class="p-4">
        <h3 class="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">数据总览</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card bg-surface-secondary rounded-xl p-4 border border-border-light">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="store" class="text-jd-red w-4 h-4" />
              <span class="text-xs text-text-tertiary">覆盖门店</span>
            </div>
            <div class="text-2xl font-bold text-text-primary">{{ summaryData.storeCount }}</div>
          </div>
          <div class="stat-card bg-surface-secondary rounded-xl p-4 border border-border-light">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="package" class="text-status-info w-4 h-4" />
              <span class="text-xs text-text-tertiary">日均单量</span>
            </div>
            <div class="text-2xl font-bold text-text-primary">{{ summaryData.totalOrders.toLocaleString() }}</div>
          </div>
          <div class="stat-card bg-surface-secondary rounded-xl p-4 border border-border-light">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="checkCircle" class="text-status-success w-4 h-4" />
              <span class="text-xs text-text-tertiary">准时率</span>
            </div>
            <div class="text-2xl font-bold text-status-success">{{ (summaryData.avgOnTimeRate * 100).toFixed(0) }}%</div>
          </div>
          <div class="stat-card bg-surface-secondary rounded-xl p-4 border border-border-light">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="alertTriangle" class="text-status-warning w-4 h-4" />
              <span class="text-xs text-text-tertiary">预警区域</span>
            </div>
            <div class="text-2xl font-bold text-status-warning">{{ summaryData.warningCount }}</div>
          </div>
        </div>
      </section>

      <!-- 图层控制 -->
      <section class="p-4 border-t border-border-light">
        <h3 class="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">图层控制</h3>
        <div class="space-y-1">
          <label
            v-for="layer in layerConfig"
            :key="layer.key"
            class="flex items-center cursor-pointer hover:bg-surface-secondary rounded-lg px-3 py-2.5 transition-colors"
          >
            <div class="relative">
              <input
                type="checkbox"
                :checked="appStore.visibleLayers.includes(layer.key)"
                @change="appStore.toggleLayer(layer.key)"
                class="peer sr-only"
              />
              <div class="w-9 h-5 bg-gray-200 peer-checked:bg-jd-red rounded-full transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
            <Icon :name="(layer.icon)" class="ml-3 w-4 h-4 text-text-secondary" />
            <span class="ml-2 text-sm text-text-primary">{{ layer.label }}</span>
          </label>
        </div>
      </section>

      <!-- 门店列表 -->
      <section class="p-4 border-t border-border-light">
        <h3 class="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">门店列表</h3>
        <div class="space-y-2">
          <div
            v-for="store in STORES"
            :key="store.id"
            @click="appStore.selectStore(store.id)"
            :class="[
              'store-card p-3 rounded-xl border cursor-pointer transition-all',
              selectedStore?.id === store.id 
                ? 'border-jd-red bg-red-50/50 shadow-card' 
                : 'border-border-light bg-surface hover:bg-surface-secondary hover:shadow-card'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-text-primary truncate">
                  {{ store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '') }}
                </h4>
                <div class="mt-2 flex items-center gap-4 text-xs">
                  <span class="flex items-center gap-1 text-text-secondary">
                    <Icon name="package" class="w-3.5 h-3.5" />
                    {{ store.daily_orders }}单
                  </span>
                  <span :class="['flex items-center gap-1', getOnTimeRateColor(store.on_time_rate)]">
                    <Icon name="checkCircle" class="w-3.5 h-3.5" />
                    {{ (store.on_time_rate * 100).toFixed(0) }}%
                  </span>
                </div>
              </div>
              <button 
                class="ml-2 p-1.5 rounded-lg text-text-tertiary hover:text-jd-red hover:bg-red-50 transition-colors"
                title="定位"
              >
                <Icon name="mapPin" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 洞察建议 -->
      <section class="p-4 border-t border-border-light">
        <h3 class="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">洞察建议</h3>
        <div class="space-y-2">
          <div
            v-for="insight in insights"
            :key="insight.id"
            :class="['insight-card p-3 rounded-xl border', getInsightClass(insight.type)]"
          >
            <div class="flex items-start gap-3">
              <div :class="['p-1.5 rounded-lg', getInsightIconColor(insight.type)]">
                <Icon 
                  :name="insight.type === 'warning' ? 'alertTriangle' : insight.type === 'success' ? 'checkCircle' : 'lightbulb'" 
                  class="w-4 h-4" 
                />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-text-primary">{{ insight.title }}</h4>
                <p class="text-xs text-text-secondary mt-1 leading-relaxed">{{ insight.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部操作 -->
    <div class="p-4 border-t border-border bg-surface-secondary">
      <button
        @click="appStore.resetState()"
        class="w-full py-2.5 text-sm text-text-secondary hover:text-jd-red bg-surface border border-border rounded-lg hover:border-jd-red/30 transition-all flex items-center justify-center gap-2"
      >
        <Icon name="refresh" class="w-4 h-4" />
        重置视图
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  font-size: 14px;
}

.stat-card {
  transition: all 0.2s ease-out;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.store-card {
  transition: all 0.2s ease-out;
}

.insight-card {
  transition: all 0.15s ease-out;
}

.insight-card:hover {
  transform: translateX(2px);
}

/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #CBD5E1;
}
</style>
