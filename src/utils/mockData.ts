import type { Order, TimeoutOrder, DeliveryTrip, Insight } from '@/types'
import { STORES } from '@/data/stores'

/**
 * 生成热力图数据点
 * 用于高德地图 HeatMap 图层
 */
export function generateHeatmapData(): { lng: number; lat: number; count: number }[] {
  const points: { lng: number; lat: number; count: number }[] = []
  
  for (const store of STORES) {
    // 每个门店生成 200 个订单点
    const orderCount = store.daily_orders || 300
    for (let i = 0; i < orderCount; i++) {
      // 距离衰减分布：离门店越近点越密集
      const distance = Math.random() ** 2 * 3 // 0-3km
      const angle = Math.random() * 2 * Math.PI
      
      const latOffset = (distance * Math.cos(angle)) / 111
      const lonOffset = (distance * Math.sin(angle)) / 85
      
      points.push({
        lng: store.lon + lonOffset,
        lat: store.lat + latOffset,
        count: Math.floor(Math.random() * 10) + 1 // 权重1-10
      })
    }
  }
  
  return points
}

/**
 * 生成所有门店的超时订单
 */
export function getAllTimeoutOrders(): TimeoutOrder[] {
  const allOrders: TimeoutOrder[] = []
  for (const store of STORES) {
    allOrders.push(...generateTimeoutOrders(store.id))
  }
  return allOrders
}

/**
 * 识别超时订单聚集区域
 * 使用网格聚类方法
 */
export function identifyTimeoutClusters(
  orders: TimeoutOrder[],
  gridSize: number = 0.01 // 约1km网格
): { center: { lat: number; lon: number }; count: number; radius: number }[] {
  // 构建网格
  const grid = new Map<string, TimeoutOrder[]>()
  
  for (const order of orders) {
    const gridKey = `${Math.floor(order.lat / gridSize)}_${Math.floor(order.lon / gridSize)}`
    if (!grid.has(gridKey)) {
      grid.set(gridKey, [])
    }
    grid.get(gridKey)!.push(order)
  }
  
  // 找出超时订单密集的网格（≥5单）
  const clusters: { center: { lat: number; lon: number }; count: number; radius: number }[] = []
  
  for (const [, cellOrders] of grid) {
    if (cellOrders.length >= 5) {
      // 计算聚集区域中心
      const centerLat = cellOrders.reduce((sum: number, o: TimeoutOrder) => sum + o.lat, 0) / cellOrders.length
      const centerLon = cellOrders.reduce((sum: number, o: TimeoutOrder) => sum + o.lon, 0) / cellOrders.length
      
      // 计算半径（最远点距离）
      let maxDist = 0
      for (const order of cellOrders) {
        const dist = Math.sqrt(
          Math.pow((order.lat - centerLat) * 111000, 2) +
          Math.pow((order.lon - centerLon) * 85000, 2)
        )
        maxDist = Math.max(maxDist, dist)
      }
      
      clusters.push({
        center: { lat: centerLat, lon: centerLon },
        count: cellOrders.length,
        radius: Math.max(maxDist + 100, 300) // 至少300米半径
      })
    }
  }
  
  return clusters
}

/**
 * 生成模拟订单数据
 * 按照距离衰减模型：离门店越近订单越多
 */
export function generateMockOrders(storeId: number, count: number = 100): Order[] {
  const store = STORES.find(s => s.id === storeId)
  if (!store) return []

  const orders: Order[] = []
  const baseTime = new Date('2026-01-16 08:00:00')

  for (let i = 0; i < count; i++) {
    // 使用距离衰减分布生成订单位置
    const distance = Math.random() ** 2 * 3 // 0-3km，二次衰减
    const angle = Math.random() * 2 * Math.PI
    
    // 转换为经纬度偏移（约85km/度经度，111km/度纬度）
    const latOffset = (distance * Math.cos(angle)) / 111
    const lonOffset = (distance * Math.sin(angle)) / 85

    const customerLat = store.lat + latOffset
    const customerLon = store.lon + lonOffset

    // 配送时长：基础时间 + 距离相关时间 + 随机波动
    const baseDuration = 15
    const distanceDuration = distance * 5
    const randomDuration = (Math.random() - 0.5) * 10
    const duration = Math.max(10, Math.round(baseDuration + distanceDuration + randomDuration))

    const orderTime = new Date(baseTime.getTime() + i * 5 * 60 * 1000) // 每5分钟一单
    const deliveryTime = new Date(orderTime.getTime() + duration * 60 * 1000)

    orders.push({
      order_id: `2026011600${String(i + 1).padStart(4, '0')}`,
      store_id: storeId,
      customer_lat: customerLat,
      customer_lon: customerLon,
      order_time: orderTime.toISOString(),
      delivery_time: deliveryTime.toISOString(),
      duration,
      is_timeout: duration > 30
    })
  }

  return orders
}

/**
 * 生成超时订单数据
 */
export function generateTimeoutOrders(storeId: number): TimeoutOrder[] {
  const store = STORES.find(s => s.id === storeId)
  if (!store) return []

  const reasons = [
    { reason: '配送距离过远', category: '距离类', weight: 0.35 },
    { reason: '小区门禁限制', category: '门禁类', weight: 0.25 },
    { reason: '电梯等待时间长', category: '等待类', weight: 0.15 },
    { reason: '地下车库难找', category: '末端配送类', weight: 0.10 },
    { reason: '用户不在家', category: '用户类', weight: 0.08 },
    { reason: '交通拥堵', category: '交通类', weight: 0.07 }
  ]

  const timeoutCount = store.timeout_orders || 40
  const timeoutOrders: TimeoutOrder[] = []

  for (let i = 0; i < timeoutCount; i++) {
    // 超时订单更可能在服务范围边缘
    const distance = 1.5 + Math.random() * 2 // 1.5-3.5km
    const angle = Math.random() * 2 * Math.PI
    
    const latOffset = (distance * Math.cos(angle)) / 111
    const lonOffset = (distance * Math.sin(angle)) / 85

    // 随机选择超时原因
    const rand = Math.random()
    let cumWeight = 0
    let selectedReason = reasons[0]!
    for (const r of reasons) {
      cumWeight += r.weight
      if (rand <= cumWeight) {
        selectedReason = r
        break
      }
    }

    const duration = 31 + Math.floor(Math.random() * 20) // 31-50分钟

    timeoutOrders.push({
      order_id: `TO2026011600${String(i + 1).padStart(4, '0')}`,
      lat: store.lat + latOffset,
      lon: store.lon + lonOffset,
      duration,
      timeout_duration: duration - 30,
      reason: selectedReason!.reason,
      reason_category: selectedReason!.category
    })
  }

  return timeoutOrders
}

/**
 * 生成配送行程数据
 */
export function generateDeliveryTrips(storeId: number, count: number = 5): DeliveryTrip[] {
  const store = STORES.find(s => s.id === storeId)
  if (!store) return []

  const trips: DeliveryTrip[] = []

  for (let t = 0; t < count; t++) {
    const orderCount = 3 + Math.floor(Math.random() * 2) // 3-4单
    const orders = []
    
    // 门店出发点
    orders.push({ seq: 0, lat: store.lat, lon: store.lon })

    // 生成配送点
    for (let i = 0; i < orderCount; i++) {
      const distance = 0.5 + Math.random() * 2
      const angle = Math.random() * 2 * Math.PI
      orders.push({
        seq: i + 1,
        lat: store.lat + (distance * Math.cos(angle)) / 111,
        lon: store.lon + (distance * Math.sin(angle)) / 85
      })
    }

    // 实际路径（按订单序号）
    const actualPath = orders.map(o => ({ lat: o.lat, lon: o.lon }))
    
    // 优化路径（贪心算法：每次选最近点）
    const optimalPath = calculateOptimalPath(orders)

    // 计算时间
    const actualDuration = calculatePathDuration(actualPath)
    const optimalDuration = calculatePathDuration(optimalPath)

    trips.push({
      trip_id: `T20260116${String(storeId).padStart(2, '0')}${String(t + 1).padStart(2, '0')}`,
      rider_id: `R${String(storeId).padStart(3, '0')}`,
      store_id: storeId,
      orders,
      actual_path: actualPath,
      actual_duration: actualDuration,
      optimal_path: optimalPath,
      optimal_duration: optimalDuration,
      time_saved: actualDuration - optimalDuration
    })
  }

  return trips
}

/**
 * 贪心算法计算最优路径
 */
function calculateOptimalPath(orders: { seq: number; lat: number; lon: number }[]): { lat: number; lon: number }[] {
  if (orders.length <= 2) return orders.map(o => ({ lat: o.lat, lon: o.lon }))

  const path: { lat: number; lon: number }[] = []
  const remaining = [...orders.slice(1)] // 除门店外的点
  let current = orders[0]! // 从门店出发
  
  path.push({ lat: current.lat, lon: current.lon })

  while (remaining.length > 0) {
    // 找最近点
    let minDist = Infinity
    let minIndex = 0
    
    for (let i = 0; i < remaining.length; i++) {
      const point = remaining[i]!
      const dist = Math.sqrt(
        Math.pow((point.lat - current.lat) * 111, 2) +
        Math.pow((point.lon - current.lon) * 85, 2)
      )
      if (dist < minDist) {
        minDist = dist
        minIndex = i
      }
    }

    current = remaining[minIndex]!
    path.push({ lat: current.lat, lon: current.lon })
    remaining.splice(minIndex, 1)
  }

  return path
}

/**
 * 计算路径总时长（分钟）
 */
function calculatePathDuration(path: { lat: number; lon: number }[]): number {
  let totalDist = 0
  for (let i = 1; i < path.length; i++) {
    const curr = path[i]!
    const prev = path[i-1]!
    totalDist += Math.sqrt(
      Math.pow((curr.lat - prev.lat) * 111, 2) +
      Math.pow((curr.lon - prev.lon) * 85, 2)
    )
  }
  // 假设平均骑行速度20km/h，加上每单3分钟停留
  return Math.round(totalDist / 20 * 60 + path.length * 3)
}

/**
 * 生成洞察建议
 */
export function generateInsights(): Insight[] {
  const insights: Insight[] = []

  // 检查各门店数据生成洞察
  for (const store of STORES) {
    // 超时预警
    if (store.on_time_rate < 0.88) {
      insights.push({
        id: `warning-${store.id}`,
        type: 'warning',
        title: '超时预警',
        description: `${store.name.replace('七鲜超市(', '').replace(')', '')}准时率${(store.on_time_rate * 100).toFixed(0)}%，建议增派骑手`,
        store_id: store.id,
        priority: store.on_time_rate < 0.85 ? 'high' : 'medium'
      })
    }

    // 表现优异
    if (store.on_time_rate >= 0.91) {
      insights.push({
        id: `success-${store.id}`,
        type: 'success',
        title: '表现优异',
        description: `${store.name.replace('七鲜超市(', '').replace(')', '')}准时率${(store.on_time_rate * 100).toFixed(0)}%`,
        store_id: store.id,
        priority: 'low'
      })
    }
  }

  // 添加通用优化建议
  insights.push({
    id: 'suggestion-1',
    type: 'suggestion',
    title: '优化建议',
    description: '高峰期(11:00-13:00)建议提前调配运力',
    priority: 'medium'
  })

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return insights.slice(0, 5) // 返回前5条
}
