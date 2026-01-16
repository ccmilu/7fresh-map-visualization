import * as d3 from 'd3'
import * as turf from '@turf/turf'
import type { Store, ServiceArea, Coordinate } from '@/types'

// 等时圈数据类型
interface IsochroneStore {
  store_id: number
  store_name: string
  center: [number, number]
  isochrone: {
    type: string
    features: Array<{
      type: string
      geometry: {
        type: string
        coordinates: number[][][]
      }
      properties: {
        area: number
        reachfactor: number
      }
    }>
  }
}

interface IsochroneData {
  stores: IsochroneStore[]
}

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
 * 生成带等时圈约束的服务范围
 * 泰森多边形 ∩ 15分钟骑行等时圈 = 最终服务范围
 */
export function generateServiceAreasWithIsochrone(
  stores: Store[],
  isochroneData: IsochroneData,
  bounds: [number, number, number, number] = [116.2, 39.75, 116.7, 40.05]
): ServiceArea[] {
  if (stores.length === 0) return []

  // 先生成泰森多边形
  const voronoiAreas = generateVoronoiAreas(stores, bounds)

  // 与等时圈取交集
  const serviceAreas: ServiceArea[] = voronoiAreas.map(area => {
    const isoStore = isochroneData.stores.find(s => s.store_id === area.store_id)
    
    if (!isoStore || !isoStore.isochrone.features[0]) {
      return area // 没有等时圈数据则返回原泰森多边形
    }

    const isoPolygonCoords = isoStore.isochrone.features[0].geometry.coordinates
    const voronoiCoords = area.polygon.map(c => [c.lon, c.lat])
    
    // 确保多边形闭合
    if (voronoiCoords.length > 0) {
      const first = voronoiCoords[0]
      const last = voronoiCoords[voronoiCoords.length - 1]
      if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        voronoiCoords.push([...first])
      }
    }

    try {
      // 创建Turf多边形
      const voronoiPoly = turf.polygon([voronoiCoords])
      const isoPoly = turf.polygon(isoPolygonCoords)
      
      // 计算交集
      const intersection = turf.intersect(turf.featureCollection([voronoiPoly, isoPoly]))
      
      if (intersection && intersection.geometry.type === 'Polygon') {
        let coords = intersection.geometry.coordinates[0] as number[][]
        
        // 简化多边形到8-12个顶点
        const simplified = simplifyToTargetPoints(coords, 8, 12)
        
        const polygon: Coordinate[] = simplified.map(([lon, lat]) => ({ 
          lat: lat!, 
          lon: lon! 
        }))

        // 计算面积
        const areaSqkm = turf.area(intersection) / 1_000_000

        return {
          ...area,
          polygon,
          area_sqkm: Math.round(areaSqkm * 100) / 100
        }
      }
    } catch (e) {
      console.warn(`计算门店 ${area.store_id} 交集失败:`, e)
    }

    return area
  })

  return serviceAreas
}

/**
 * 将多边形简化到目标点数范围 (min-max)
 */
function simplifyToTargetPoints(
  coords: number[][],
  minPoints: number,
  maxPoints: number
): number[][] {
  if (coords.length <= maxPoints) {
    // 如果点数已经在范围内，保持不变
    if (coords.length >= minPoints) return coords
    // 点数太少，需要插值（罕见情况）
    return coords
  }

  // 使用Turf简化
  const line = turf.lineString(coords)
  let tolerance = 0.0001 // 初始容差
  let simplified = coords

  // 逐步增加容差直到点数在范围内
  while (simplified.length > maxPoints && tolerance < 0.01) {
    const simplifiedLine = turf.simplify(line, { tolerance, highQuality: true })
    simplified = simplifiedLine.geometry.coordinates as number[][]
    tolerance *= 1.5
  }

  // 确保多边形闭合
  if (simplified.length > 0) {
    const first = simplified[0]
    const last = simplified[simplified.length - 1]
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
      simplified.push([...first])
    }
  }

  // 如果简化后点数小于最小值，使用原始数据均匀采样
  if (simplified.length < minPoints) {
    const step = Math.floor(coords.length / minPoints)
    simplified = []
    for (let i = 0; i < coords.length && simplified.length < minPoints; i += step) {
      simplified.push(coords[i]!)
    }
    // 确保闭合
    if (simplified.length > 0 && coords[0]) {
      simplified.push([...coords[0]])
    }
  }

  return simplified
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
    const pi = polygon[i]!
    const pj = polygon[j]!
    // 使用Shoelace公式
    area += pi.lon * pj.lat
    area -= pj.lon * pi.lat
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
    const point = polygon[i]
    if (point) simplified.push(point)
  }

  return simplified
}

/**
 * 将Coordinate数组转换为高德地图路径格式
 */
export function toAMapPath(polygon: Coordinate[]): [number, number][] {
  return polygon.map(c => [c.lon, c.lat])
}
