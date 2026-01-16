// 门店数据类型
export interface Store {
  id: number
  name: string
  lat: number
  lon: number
  daily_orders: number
  on_time_rate: number
  avg_delivery_time?: number
  timeout_orders?: number
}

// 服务区域数据类型
export interface ServiceArea {
  store_id: number
  polygon: Coordinate[]
  area_sqkm: number
  daily_orders: number
}

// 坐标类型
export interface Coordinate {
  lat: number
  lon: number
}

// 订单数据类型
export interface Order {
  order_id: string
  store_id: number
  customer_lat: number
  customer_lon: number
  order_time: string
  delivery_time: string
  duration: number
  is_timeout: boolean
}

// 超时订单类型
export interface TimeoutOrder {
  order_id: string
  lat: number
  lon: number
  duration: number
  timeout_duration: number
  reason: string
  reason_category: string
}

// 配送行程类型
export interface DeliveryTrip {
  trip_id: string
  rider_id: string
  store_id: number
  orders: TripPoint[]
  actual_path: Coordinate[]
  actual_duration: number
  optimal_path: Coordinate[]
  optimal_duration: number
  time_saved: number
}

export interface TripPoint {
  seq: number
  lat: number
  lon: number
}

// 图层类型
export type LayerType = 
  | 'stores' 
  | 'serviceArea' 
  | 'heatmap' 
  | 'timeout' 
  | 'route'

// 洞察建议类型
export interface Insight {
  id: string
  type: 'warning' | 'success' | 'suggestion'
  title: string
  description: string
  store_id?: number
  priority: 'high' | 'medium' | 'low'
}

// 应用状态类型
export interface AppState {
  currentStore: number | null
  visibleLayers: LayerType[]
  selectedTrip: string | null
}
