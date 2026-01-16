/**
 * 下载门店16分钟骑行等时圈数据
 * 调用 HeiGIT OpenRouteService API
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ4MzQ4ZjA4YWFkNzQzOGRiYWMzZDZlOGMzNjU3ZTA1IiwiaCI6Im11cm11cjY0In0='
const API_URL = 'https://api.openrouteservice.org/v2/isochrones/cycling-regular'

// 门店数据 (lon, lat 顺序，GeoJSON标准)
const STORES = [
  { id: 1, name: '七鲜超市(北京姚家园万象汇店)', lon: 116.515733, lat: 39.941334 },
  { id: 2, name: '七鲜超市(青年西路店)', lon: 116.515234, lat: 39.916644 },
  { id: 3, name: '七鲜超市(北京好世界店)', lon: 116.463258, lat: 39.920878 },
  { id: 4, name: '京东七鲜(东土城路店)', lon: 116.433021, lat: 39.954024 },
  { id: 5, name: '七鲜超市(酒仙桥中路店)', lon: 116.498254, lat: 39.975499 },
  { id: 6, name: '七鲜超市(北京东坝万达店)', lon: 116.549171, lat: 39.962149 }
]

async function fetchIsochrone(store) {
  const body = {
    locations: [[store.lon, store.lat]],
    range: [960], // 16分钟 = 960秒
    range_type: 'time',
    attributes: ['area', 'reachfactor']
  }

  console.log(`正在获取 ${store.name} 的等时圈...`)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API_KEY
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API请求失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return {
    store_id: store.id,
    store_name: store.name,
    center: [store.lon, store.lat],
    isochrone: data
  }
}

async function main() {
  const results = []
  
  for (const store of STORES) {
    try {
      const result = await fetchIsochrone(store)
      results.push(result)
      console.log(`✓ ${store.name} 完成`)
      // 避免API限流，每次请求间隔1.5秒
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error(`✗ ${store.name} 失败:`, error.message)
    }
  }

  // 输出JSON结果
  const output = {
    generated_at: new Date().toISOString(),
    description: '16分钟骑行等时圈数据 (OpenRouteService)',
    range_seconds: 960,
    profile: 'cycling-regular',
    stores: results
  }

  // 写入文件
  const outputPath = path.join(__dirname, '../src/data/isochrones.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n✓ 等时圈数据已保存到: ${outputPath}`)
}

main().catch(console.error)
