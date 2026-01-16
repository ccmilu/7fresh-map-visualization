import * as d3 from 'd3'
import type { Store, ServiceArea, Coordinate } from '@/types'

/**
 * 使用D3的Delaunay生成泰森多边形
 * @param stores 门店列表
 * @param bounds 边界范围 [minLng, minLat, maxLng, maxLat]
 * @returns 服务区域列表
 */
export function generateVoronoiAreas(
  stores: Store[],
  bounds: [number, number, number, number] = [116.2, 39.75, 116.7, 40.05]
): ServiceArea[] {
  if (stores.length === 0) return []

  // 提取门店坐标点
  const points = stores.map(s => [s.lon, s.lat] as [number, number])
  
  // 创建Delaunay三角剖分
  const delaunay = d3.Delaunay.from(points)
  
  // 生成Voronoi图
  const voronoi = delaunay.voronoi(bounds)

  // 为每个门店生成服务区域
  const areas: ServiceArea[] = stores.map((store, index) => {
    const cellPolygon = voronoi.cellPolygon(index)
    
    // 转换为坐标格式
    const polygon: Coordinate[] = cellPolygon 
      ? cellPolygon.map(([lon, lat]) => ({ lat, lon }))
      : []

    // 计算面积（简化计算，使用多边形面积公式）
    const areaSqkm = calculatePolygonArea(polygon)

    return {
      store_id: store.id,
      polygon,
      area_sqkm: Math.round(areaSqkm * 100) / 100,
      daily_orders: store.daily_orders
    }
  })

  return areas
}

/**
 * 计算多边形面积（平方公里）
 * 使用球面近似计算
 */
function calculatePolygonArea(polygon: Coordinate[]): number {
  if (polygon.length < 3) return 0

  let area = 0
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    // 使用Shoelace公式
    area += polygon[i].lon * polygon[j].lat
    area -= polygon[j].lon * polygon[i].lat
  }

  area = Math.abs(area) / 2

  // 经纬度转换为公里（在北京附近，1度经度≈85km，1度纬度≈111km）
  const latScale = 111 // km per degree
  const lonScale = 85  // km per degree at ~40°N
  
  return area * latScale * lonScale
}

/**
 * 将多边形简化为指定数量的顶点
 */
export function simplifyPolygon(polygon: Coordinate[], maxPoints: number = 12): Coordinate[] {
  if (polygon.length <= maxPoints) return polygon

  // 使用Douglas-Peucker简化算法的简化版本
  // 每隔一定间隔取点
  const step = Math.ceil(polygon.length / maxPoints)
  const simplified: Coordinate[] = []
  
  for (let i = 0; i < polygon.length; i += step) {
    simplified.push(polygon[i])
  }

  return simplified
}

/**
 * 将Coordinate数组转换为高德地图路径格式
 */
export function toAMapPath(polygon: Coordinate[]): [number, number][] {
  return polygon.map(c => [c.lon, c.lat])
}
