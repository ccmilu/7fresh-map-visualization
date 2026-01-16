import type { Order, TimeoutOrder, DeliveryTrip, Insight } from '@/types'
import { STORES } from '@/data/stores'

/**
 * 生成热力图数据点
 * 用于高德地图 HeatMap 图层
 * 特点：
 * 1. 大部分区域是中低密度，颜色有明显变化
 * 2. 少数热点区域呈现橙红色
 * 3. 热点分布随机，形状自然不规则
 */
export function generateHeatmapData(): { lng: number; lat: number; count: number }[] {
  const points: { lng: number; lat: number; count: number }[] = []
  
  // 使用固定种子让热点位置稳定
  const seed = 42
  const seededRandom = createSeededRandom(seed)
  
  for (const store of STORES) {
    const orderCount = store.daily_orders || 300
    
    // 1. 背景层：稀疏的低密度点（40%）- 蓝色区域
    const bgCount = Math.floor(orderCount * 0.4)
    for (let i = 0; i < bgCount; i++) {
      const distance = Math.random() ** 1.2 * 3.5
      const angle = Math.random() * 2 * Math.PI
      const noise = (Math.random() - 0.5) * 0.2
      
      points.push({
        lng: store.lon + (distance * Math.sin(angle) + noise) / 85,
        lat: store.lat + (distance * Math.cos(angle) + noise) / 111,
        count: 1 + Math.floor(Math.random() * 2)  // 权重1-2
      })
    }
    
    // 2. 中间层：门店周边1-2km的中等密度区域（30%）- 绿色/青色区域
    const midCount = Math.floor(orderCount * 0.3)
    for (let i = 0; i < midCount; i++) {
      const distance = 0.3 + Math.random() * 1.5  // 0.3-1.8km
      const angle = Math.random() * 2 * Math.PI
      const noise = (Math.random() - 0.5) * 0.15
      
      points.push({
        lng: store.lon + (distance * Math.sin(angle) + noise) / 85,
        lat: store.lat + (distance * Math.cos(angle) + noise) / 111,
        count: 3 + Math.floor(Math.random() * 4)  // 权重3-6
      })
    }
    
    // 3. 门店核心区域：高密度（15%）- 黄色区域
    const coreCount = Math.floor(orderCount * 0.15)
    for (let i = 0; i < coreCount; i++) {
      const distance = Math.random() ** 2 * 0.8  // 0-0.8km，集中在门店附近
      const angle = Math.random() * 2 * Math.PI
      const noise = (Math.random() - 0.5) * 0.08
      
      points.push({
        lng: store.lon + (distance * Math.sin(angle) + noise) / 85,
        lat: store.lat + (distance * Math.cos(angle) + noise) / 111,
        count: 6 + Math.floor(Math.random() * 5)  // 权重6-10
      })
    }
    
    // 4. 热点区域：1-2个明显的红色热点
    const hasHotspot = seededRandom() > 0.25  // 75%概率有热点
    if (hasHotspot) {
      const hotspotCount = seededRandom() > 0.5 ? 2 : 1
      
      for (let h = 0; h < hotspotCount; h++) {
        // 热点位置
        const hotspotDist = 0.8 + seededRandom() * 1.2
        const hotspotAngle = seededRandom() * 2 * Math.PI
        const hotspotLat = store.lat + (hotspotDist * Math.cos(hotspotAngle)) / 111
        const hotspotLon = store.lon + (hotspotDist * Math.sin(hotspotAngle)) / 85
        
        // 热点外围 - 黄色过渡区（椭圆形不规则）
        const outerCount = 25 + Math.floor(seededRandom() * 20)
        const ellipseAngle = seededRandom() * Math.PI
        const a = 0.25 + seededRandom() * 0.15
        const b = 0.12 + seededRandom() * 0.08
        
        for (let i = 0; i < outerCount; i++) {
          const r = 0.3 + Math.sqrt(Math.random()) * 0.7
          const theta = Math.random() * 2 * Math.PI
          
          let dx = r * Math.cos(theta) * a
          let dy = r * Math.sin(theta) * b
          const rotatedDx = dx * Math.cos(ellipseAngle) - dy * Math.sin(ellipseAngle)
          const rotatedDy = dx * Math.sin(ellipseAngle) + dy * Math.cos(ellipseAngle)
          const noise = (Math.random() - 0.5) * 0.06
          
          points.push({
            lng: hotspotLon + rotatedDx / 85 + noise / 85,
            lat: hotspotLat + rotatedDy / 111 + noise / 111,
            count: 8 + Math.floor(Math.random() * 6)  // 权重8-13
          })
        }
        
        // 热点核心 - 橙红色区域
        const coreCount = 15 + Math.floor(seededRandom() * 12)
        for (let i = 0; i < coreCount; i++) {
          const r = Math.random() * 0.12
          const theta = Math.random() * 2 * Math.PI
          let dx = r * Math.cos(theta) * a * 0.5
          let dy = r * Math.sin(theta) * b * 0.5
          const rotatedDx = dx * Math.cos(ellipseAngle) - dy * Math.sin(ellipseAngle)
          const rotatedDy = dx * Math.sin(ellipseAngle) + dy * Math.cos(ellipseAngle)
          
          points.push({
            lng: hotspotLon + rotatedDx / 85,
            lat: hotspotLat + rotatedDy / 111,
            count: 14 + Math.floor(Math.random() * 8)  // 权重14-21
          })
        }
        
        // 热点中心 - 最红的几个点
        for (let i = 0; i < 5; i++) {
          const microR = Math.random() * 0.03
          const microTheta = Math.random() * 2 * Math.PI
          points.push({
            lng: hotspotLon + (microR * Math.cos(microTheta)) / 85,
            lat: hotspotLat + (microR * Math.sin(microTheta)) / 111,
            count: 20 + Math.floor(Math.random() * 10)  // 权重20-29
          })
        }
      }
    }
  }
  
  return points
}

/**
 * 创建带种子的随机数生成器（让热点位置稳定）
 */
function createSeededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * 生成所有门店的超时订单
 * 特点：
 * 1. 总体数量很少（每天只有几单超时是正常的）
 * 2. 超时订单聚集在1-2个"问题区域"（如某个封闭小区）
 * 3. 其他地方只有零星几个
 */
export function getAllTimeoutOrders(): TimeoutOrder[] {
  const allOrders: TimeoutOrder[] = []
  
  // 使用固定种子保持稳定
  const seed = 123
  const seededRandom = createSeededRandom(seed)
  
  // 定义1-2个"问题区域"（配送黑洞）
  // 选择2个门店附近作为问题区域
  const problemAreas = [
    {
      // 姚家园店东北方向 - 某封闭小区
      baseLat: 39.941334 + 0.015,
      baseLon: 116.515733 + 0.012,
      name: '阳光花园小区',
      reason: '小区门禁限制',
      count: 8  // 这个区域有8单超时
    },
    {
      // 东土城路店西南方向 - 某写字楼
      baseLat: 39.954024 - 0.008,
      baseLon: 116.433021 - 0.010,
      name: '科技园写字楼',
      reason: '电梯等待时间长',
      count: 5  // 这个区域有5单超时
    }
  ]
  
  // 在问题区域生成聚集的超时订单
  problemAreas.forEach((area, areaIndex) => {
    for (let i = 0; i < area.count; i++) {
      // 聚集在小范围内（约200-400米范围）
      const r = 0.1 + seededRandom() * 0.2
      const theta = seededRandom() * 2 * Math.PI
      
      const lat = area.baseLat + (r * Math.cos(theta)) / 111
      const lon = area.baseLon + (r * Math.sin(theta)) / 85
      
      const duration = 35 + Math.floor(seededRandom() * 12)  // 35-46分钟
      
      allOrders.push({
        order_id: `TO${areaIndex}${String(i + 1).padStart(3, '0')}`,
        lat,
        lon,
        duration,
        timeout_duration: duration - 30,
        reason: area.reason,
        reason_category: area.reason === '小区门禁限制' ? '门禁类' : '等待类'
      })
    }
  })
  
  // 在其他区域添加零星几个超时订单（每个门店0-1个）
  STORES.forEach((store, idx) => {
    // 只有30%的门店有零星超时
    if (seededRandom() > 0.7) {
      const distance = 1.5 + seededRandom() * 1.5
      const angle = seededRandom() * 2 * Math.PI
      
      const lat = store.lat + (distance * Math.cos(angle)) / 111
      const lon = store.lon + (distance * Math.sin(angle)) / 85
      
      const reasons = ['配送距离过远', '用户不在家', '地下车库难找']
      const reason = reasons[Math.floor(seededRandom() * reasons.length)]!
      const duration = 32 + Math.floor(seededRandom() * 8)  // 32-39分钟
      
      allOrders.push({
        order_id: `TOS${idx}001`,
        lat,
        lon,
        duration,
        timeout_duration: duration - 30,
        reason,
        reason_category: '其他'
      })
    }
  })
  
  return allOrders
}

/**
 * 识别超时订单聚集区域
 * 使用网格聚类方法
 * 阈值降低到3单，因为现在超时订单总数很少
 */
export function identifyTimeoutClusters(
  orders: TimeoutOrder[],
  gridSize: number = 0.008 // 约800米网格（更小的网格更精确）
): { center: { lat: number; lon: number }; count: number; radius: number }[] {
  // 构建网格
  const grid: { [key: string]: TimeoutOrder[] } = {}
  
  for (const order of orders) {
    const gridKey = `${Math.floor(order.lat / gridSize)}_${Math.floor(order.lon / gridSize)}`
    if (!grid[gridKey]) {
      grid[gridKey] = []
    }
    grid[gridKey].push(order)
  }
  
  // 找出超时订单密集的网格（≥3单即可标记为问题区域）
  const clusters: { center: { lat: number; lon: number }; count: number; radius: number }[] = []
  
  for (const key in grid) {
    const cellOrders = grid[key]!
    if (cellOrders.length >= 3) {
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
        radius: Math.max(maxDist + 80, 250) // 至少250米半径
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
