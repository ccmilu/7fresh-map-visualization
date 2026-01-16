import type { Store } from '@/types'

export const STORES: Store[] = [
  {
    id: 1,
    name: '七鲜超市(北京姚家园万象汇店)',
    lat: 39.941334,
    lon: 116.515733,
    daily_orders: 320,
    on_time_rate: 0.87,
    avg_delivery_time: 23,
    timeout_orders: 42
  },
  {
    id: 2,
    name: '七鲜超市(青年西路店)',
    lat: 39.975499,
    lon: 116.498254,
    daily_orders: 450,
    on_time_rate: 0.92,
    avg_delivery_time: 21,
    timeout_orders: 36
  },
  {
    id: 3,
    name: '七鲜超市(北京好世界店)',
    lat: 39.920878,
    lon: 116.463258,
    daily_orders: 380,
    on_time_rate: 0.89,
    avg_delivery_time: 24,
    timeout_orders: 42
  },
  {
    id: 4,
    name: '京东七鲜(东土城路店)',
    lat: 39.847554,
    lon: 116.320283,
    daily_orders: 290,
    on_time_rate: 0.85,
    avg_delivery_time: 26,
    timeout_orders: 44
  },
  {
    id: 5,
    name: '七鲜超市(酒仙桥中路店)',
    lat: 39.985123,
    lon: 116.512456,
    daily_orders: 410,
    on_time_rate: 0.91,
    avg_delivery_time: 22,
    timeout_orders: 37
  },
  {
    id: 6,
    name: '七鲜超市(北京东坝万达店)',
    lat: 39.962149,
    lon: 116.549171,
    daily_orders: 350,
    on_time_rate: 0.88,
    avg_delivery_time: 25,
    timeout_orders: 42
  }
]

// 计算汇总数据
export const getSummaryData = () => {
  const totalOrders = STORES.reduce((sum, s) => sum + s.daily_orders, 0)
  const avgOnTimeRate = STORES.reduce((sum, s) => sum + s.on_time_rate, 0) / STORES.length
  const warningCount = STORES.filter(s => s.on_time_rate < 0.88).length

  return {
    storeCount: STORES.length,
    totalOrders,
    avgOnTimeRate,
    warningCount
  }
}
