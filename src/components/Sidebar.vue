<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { STORES, getSummaryData } from '@/data/stores'
import { generateInsights } from '@/utils/mockData'
import type { LayerType } from '@/types'
import Icon from './icons/Icon.vue'
import type { IconName } from './icons/index'

const appStore = useAppStore()
const summaryData = getSummaryData()
const insights = generateInsights()

// 图层配置
const layerConfig: { key: LayerType; label: string; icon: IconName }[] = [
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

// 获取准时率文字颜色
function getOnTimeRateColor(rate: number): string {
  if (rate >= 0.9) return 'text-status-success'
  if (rate >= 0.85) return 'text-status-warning'
  return 'text-status-danger'
}

// 获取门店卡片背景色（根据准时率）
function getStoreCardBg(rate: number, isSelected: boolean): string {
  if (isSelected) {
    if (rate >= 0.9) return 'bg-emerald-100/70 border-emerald-300'
    if (rate >= 0.85) return 'bg-amber-100/70 border-amber-300'
    return 'bg-red-100/70 border-red-300'
  }
  if (rate >= 0.9) return 'bg-emerald-50/50 border-emerald-200/60 hover:bg-emerald-100/50'
  if (rate >= 0.85) return 'bg-amber-50/50 border-amber-200/60 hover:bg-amber-100/50'
  return 'bg-red-50/50 border-red-200/60 hover:bg-red-100/50'
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

// 热力图门店筛选变化
function onHeatmapStoreChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value
  appStore.setHeatmapStore(value === 'all' ? null : Number(value))
}

// 配送行程相关 - 从 store 获取共享数据
const routeStoreId = computed(() => appStore.routeStoreId)
const deliveryTrips = computed(() => appStore.deliveryTrips)
const selectedTripId = computed(() => appStore.selectedTripId)
const selectedTrip = computed(() => appStore.selectedTrip)

// 选择行程
function selectTrip(tripId: string) {
  appStore.selectTrip(tripId)
}

// 格式化门店名称
function formatStoreName(name: string): string {
  return name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '')
}

// 路径门店筛选变化
function onRouteStoreChange(event: Event) {
  const target = event.target as HTMLSelectElement
  appStore.setRouteStore(Number(target.value))
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
          <template v-for="layer in layerConfig" :key="layer.key">
            <label
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
            <!-- 热力图门店筛选 -->
            <div
              v-if="layer.key === 'heatmap' && appStore.visibleLayers.includes('heatmap')"
              class="ml-12 mt-1 mb-2"
            >
              <select
                :value="appStore.heatmapStoreId ?? 'all'"
                @change="onHeatmapStoreChange($event)"
                class="w-full px-3 py-2 text-sm bg-surface-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-jd-red/20 focus:border-jd-red transition-colors"
              >
                <option value="all">全部门店</option>
                <option v-for="store in STORES" :key="store.id" :value="store.id">
                  {{ store.name.replace('七鲜超市(', '').replace('京东七鲜(', '').replace(')', '') }}
                </option>
              </select>
            </div>
          </template>
          <!-- 路径分析门店筛选 -->
          <div
            v-if="appStore.visibleLayers.includes('route')"
            class="ml-12 mt-1 mb-2"
          >
            <select
              :value="routeStoreId"
              @change="onRouteStoreChange($event)"
              class="w-full px-3 py-2 text-sm bg-surface-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-jd-red/20 focus:border-jd-red transition-colors"
            >
              <option v-for="store in STORES" :key="store.id" :value="store.id">
                {{ formatStoreName(store.name) }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- 配送行程列表（仅在路径分析图层开启时显示） -->
      <section v-if="appStore.visibleLayers.includes('route')" class="p-4 border-t border-border-light">
        <h3 class="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">配送行程</h3>
        <div class="space-y-2">
          <div
            v-for="trip in deliveryTrips"
            :key="trip.trip_id"
            @click="selectTrip(trip.trip_id)"
            :class="[
              'trip-card p-3 rounded-xl border cursor-pointer transition-all',
              selectedTripId === trip.trip_id 
                ? 'bg-blue-50 border-blue-300 shadow-card ring-1 ring-blue-400 ring-offset-1' 
                : 'bg-surface-secondary border-border-light hover:bg-blue-50/50 hover:border-blue-200'
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Icon name="route" class="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span class="text-sm font-medium text-text-primary">行程 {{ trip.trip_id.slice(-2) }}</span>
              </div>
              <span class="text-xs text-text-tertiary">{{ trip.orders.length - 1 }}个配送点</span>
            </div>
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span class="text-text-secondary">实际 {{ trip.actual_duration }}分钟</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-text-secondary">优化 {{ trip.optimal_duration }}分钟</span>
              </div>
              <span 
                v-if="trip.time_saved > 0"
                class="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
              >
                省{{ trip.time_saved }}分钟
              </span>
            </div>
          </div>
        </div>
        
        <!-- 选中行程详情 -->
        <div v-if="selectedTrip" class="mt-4 p-3 bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl border border-blue-200">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="route" class="w-4 h-4 text-blue-600" />
            <span class="text-sm font-medium text-text-primary">路径对比详情</span>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-0.5 bg-blue-500 rounded"></span>
                <span class="text-text-secondary">实际路径（蓝色虚线）</span>
              </div>
              <span class="font-medium text-text-primary">{{ selectedTrip.actual_duration }} 分钟</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-0.5 bg-emerald-500 rounded"></span>
                <span class="text-text-secondary">优化路径（绿色实线）</span>
              </div>
              <span class="font-medium text-text-primary">{{ selectedTrip.optimal_duration }} 分钟</span>
            </div>
            <div class="pt-2 mt-2 border-t border-blue-200/50 flex items-center justify-between">
              <span class="text-text-secondary">优化后可节省</span>
              <span class="font-bold text-emerald-600">{{ selectedTrip.time_saved }} 分钟</span>
            </div>
          </div>
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
              getStoreCardBg(store.on_time_rate, selectedStore?.id === store.id),
              selectedStore?.id === store.id ? 'shadow-card ring-1 ring-offset-1' : 'hover:shadow-card',
              selectedStore?.id === store.id && store.on_time_rate >= 0.9 ? 'ring-emerald-400' : '',
              selectedStore?.id === store.id && store.on_time_rate >= 0.85 && store.on_time_rate < 0.9 ? 'ring-amber-400' : '',
              selectedStore?.id === store.id && store.on_time_rate < 0.85 ? 'ring-red-400' : ''
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
