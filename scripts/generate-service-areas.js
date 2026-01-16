/**
 * 预计算服务范围数据
 * 泰森多边形 ∩ 等时圈 = 最终服务范围
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as d3 from 'd3'
import * as turf from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 门店数据
const STORES = [
  { id: 1, name: '七鲜超市(北京姚家园万象汇店)', lon: 116.515733, lat: 39.941334, daily_orders: 320 },
  { id: 2, name: '七鲜超市(青年西路店)', lon: 116.515234, lat: 39.916644, daily_orders: 450 },
  { id: 3, name: '七鲜超市(北京好世界店)', lon: 116.463258, lat: 39.920878, daily_orders: 380 },
  { id: 4, name: '京东七鲜(东土城路店)', lon: 116.433021, lat: 39.954024, daily_orders: 290 },
  { id: 5, name: '七鲜超市(酒仙桥中路店)', lon: 116.498254, lat: 39.975499, daily_orders: 410 },
  { id: 6, name: '七鲜超市(北京东坝万达店)', lon: 116.549171, lat: 39.962149, daily_orders: 350 }
]

// 门店颜色
const STORE_COLORS = [
  '#E2231A', // 京东红
  '#3B82F6', // 蓝色
  '#10B981', // 绿色
  '#F59E0B', // 黄色
  '#8B5CF6', // 紫色
  '#EC4899'  // 粉色
]

// 读取等时圈数据
const isochronePath = path.join(__dirname, '../src/data/isochrones.json')
const isochroneData = JSON.parse(fs.readFileSync(isochronePath, 'utf-8'))

// 生成泰森多边形
function generateVoronoi(stores, bounds = [116.35, 39.85, 116.65, 40.05]) {
  const points = stores.map(s => [s.lon, s.lat])
  const delaunay = d3.Delaunay.from(points)
  const voronoi = delaunay.voronoi(bounds)
  
  return stores.map((store, index) => {
    const cell = voronoi.cellPolygon(index)
    return {
      store_id: store.id,
      polygon: cell ? cell.map(([lon, lat]) => [lon, lat]) : []
    }
  })
}

// 在边缘上插值增加点数
function interpolatePolygon(coords, targetPoints) {
  if (!coords || coords.length < 3) return coords
  
  // 移除闭合点（如果有）
  const open = [...coords]
  const first = open[0]
  const last = open[open.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    open.pop()
  }
  
  const n = open.length
  if (n >= targetPoints) {
    open.push([...open[0]])
    return open
  }
  
  // 需要插入的点数
  const toInsert = targetPoints - n
  const result = []
  
  // 在每条边上均匀分配新点
  const pointsPerEdge = Math.ceil(toInsert / n)
  
  for (let i = 0; i < n; i++) {
    const p1 = open[i]
    const p2 = open[(i + 1) % n]
    
    result.push([...p1])
    
    // 计算这条边需要插入多少点
    const remaining = targetPoints - result.length - (n - i - 1) - 1
    const insertCount = Math.min(pointsPerEdge, Math.max(0, remaining))
    
    for (let j = 1; j <= insertCount; j++) {
      const t = j / (insertCount + 1)
      const lon = p1[0] + (p2[0] - p1[0]) * t
      const lat = p1[1] + (p2[1] - p1[1]) * t
      result.push([lon, lat])
    }
  }
  
  // 闭合
  result.push([...result[0]])
  
  return result
}

// 简化多边形到指定点数
function simplifyPolygon(coords, minPoints = 8, maxPoints = 12) {
  if (!coords || coords.length < 4) return coords
  
  // 确保闭合
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords = [...coords, [...first]]
  }
  
  // 点数不足，需要插值
  if (coords.length - 1 < minPoints) {
    return interpolatePolygon(coords, minPoints)
  }
  
  if (coords.length <= maxPoints + 1) {
    return coords
  }
  
  // 点数过多，需要简化
  try {
    const poly = turf.polygon([coords])
    let tolerance = 0.0005
    let simplified = coords
    
    while (simplified.length > maxPoints + 1 && tolerance < 0.01) {
      const simplifiedPoly = turf.simplify(poly, { tolerance, highQuality: true })
      simplified = simplifiedPoly.geometry.coordinates[0]
      tolerance *= 1.5
    }
    
    // 确保至少有minPoints个点
    if (simplified.length - 1 >= minPoints) {
      return simplified
    }
    
    // 简化后点数不足，进行插值
    return interpolatePolygon(simplified, minPoints)
  } catch (e) {
    console.warn('简化失败:', e.message)
  }
  
  return coords
}

// 计算交集
function computeIntersection(voronoiCoords, isochroneCoords) {
  if (!voronoiCoords || voronoiCoords.length < 4) return null
  if (!isochroneCoords || isochroneCoords.length < 4) return voronoiCoords
  
  try {
    // 确保闭合
    const ensureClosed = (coords) => {
      const first = coords[0]
      const last = coords[coords.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...coords, [...first]]
      }
      return coords
    }
    
    const voronoiPoly = turf.polygon([ensureClosed(voronoiCoords)])
    const isoPoly = turf.polygon([ensureClosed(isochroneCoords)])
    
    const intersection = turf.intersect(turf.featureCollection([voronoiPoly, isoPoly]))
    
    if (intersection) {
      if (intersection.geometry.type === 'Polygon') {
        return intersection.geometry.coordinates[0]
      } else if (intersection.geometry.type === 'MultiPolygon') {
        // 取最大的多边形
        let maxArea = 0
        let maxPoly = null
        for (const poly of intersection.geometry.coordinates) {
          const area = turf.area(turf.polygon(poly))
          if (area > maxArea) {
            maxArea = area
            maxPoly = poly[0]
          }
        }
        return maxPoly
      }
    }
  } catch (e) {
    console.warn('交集计算失败:', e.message)
  }
  
  return voronoiCoords
}

// 主函数
function main() {
  console.log('开始生成服务范围数据...\n')
  
  // 生成泰森多边形
  const voronoiAreas = generateVoronoi(STORES)
  console.log('✓ 泰森多边形生成完成')
  
  // 计算与等时圈的交集
  const serviceAreas = STORES.map((store, index) => {
    const voronoi = voronoiAreas[index]
    const isoStore = isochroneData.stores.find(s => s.store_id === store.id)
    
    let finalPolygon = voronoi.polygon
    let areaSqkm = 0
    
    if (isoStore && isoStore.isochrone.features[0]) {
      const isoCoords = isoStore.isochrone.features[0].geometry.coordinates[0]
      const intersection = computeIntersection(voronoi.polygon, isoCoords)
      
      if (intersection && intersection.length >= 4) {
        // 简化到8-12个点
        finalPolygon = simplifyPolygon(intersection, 8, 12)
        
        // 计算面积
        try {
          const poly = turf.polygon([finalPolygon])
          areaSqkm = turf.area(poly) / 1_000_000
        } catch (e) {
          areaSqkm = 0
        }
      }
    }
    
    console.log(`  门店 ${store.id} (${store.name.slice(0, 15)}...): ${finalPolygon.length - 1} 个顶点, ${areaSqkm.toFixed(2)} km²`)
    
    return {
      store_id: store.id,
      store_name: store.name,
      color: STORE_COLORS[index],
      polygon: finalPolygon.map(([lon, lat]) => ({ lon, lat })),
      area_sqkm: Math.round(areaSqkm * 100) / 100,
      daily_orders: store.daily_orders
    }
  })
  
  console.log('\n✓ 交集计算完成')
  
  // 保存结果
  const output = {
    generated_at: new Date().toISOString(),
    description: '门店服务范围 (泰森多边形 ∩ 15分钟骑行等时圈)',
    areas: serviceAreas
  }
  
  const outputPath = path.join(__dirname, '../src/data/serviceAreas.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  
  console.log(`\n✓ 服务范围数据已保存到: ${outputPath}`)
}

main()
