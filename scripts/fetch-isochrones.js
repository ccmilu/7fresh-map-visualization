/**
 * 从 HeiGIT openrouteservice 获取门店等时圈数据
 * 使用骑行模式，获取15分钟、30分钟等时圈
 */

const STORES = [
  { id: 1, name: '七鲜超市(北京姚家园万象汇店)', lat: 39.941334, lon: 116.515733 },
  { id: 2, name: '七鲜超市(青年西路店)', lat: 39.916644, lon: 116.515234 },
  { id: 3, name: '七鲜超市(北京好世界店)', lat: 39.920878, lon: 116.463258 },
  { id: 4, name: '京东七鲜(东土城路店)', lat: 39.954024, lon: 116.433021 },
  { id: 5, name: '七鲜超市(酒仙桥中路店)', lat: 39.975499, lon: 116.498254 },
  { id: 6, name: '七鲜超市(北京东坝万达店)', lat: 39.962149, lon: 116.549171 }
]

const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ4MzQ4ZjA4YWFkNzQzOGRiYWMzZDZlOGMzNjU3ZTA1IiwiaCI6Im11cm11cjY0In0='
const API_URL = 'https://api.openrouteservice.org/v2/isochrones/cycling-regular'

// 等时圈时间范围（秒）：15分钟、30分钟
const RANGES = [900, 1800]

async function fetchIsochrone(store) {
  const body = {
    locations: [[store.lon, store.lat]],
    range: RANGES,
    range_type: 'time',
    attributes: ['area', 'reachfactor']
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error for ${store.name}: ${response.status} - ${text}`)
  }

  return response.json()
}

async function main() {
  console.log('开始获取等时圈数据...\n')
  
  const results = {}
  
  for (const store of STORES) {
    console.log(`正在获取: ${store.name}`)
    try {
      const data = await fetchIsochrone(store)
      results[store.id] = {
        store: {
          id: store.id,
          name: store.name,
          lat: store.lat,
          lon: store.lon
        },
        isochrones: data
      }
      console.log(`  ✓ 成功获取 ${data.features?.length || 0} 个等时圈`)
      
      // 避免请求过快触发限流
      await new Promise(r => setTimeout(r, 1500))
    } catch (error) {
      console.error(`  ✗ 失败: ${error.message}`)
      results[store.id] = {
        store: {
          id: store.id,
          name: store.name,
          lat: store.lat,
          lon: store.lon
        },
        error: error.message
      }
    }
  }

  // 保存结果
  const fs = await import('fs')
  const path = await import('path')
  const outputDir = path.join(import.meta.dirname, '../src/data')
  const outputFile = path.join(outputDir, 'isochrones.json')
  
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`\n数据已保存到: ${outputFile}`)
  
  // 统计
  const successCount = Object.values(results).filter(r => !r.error).length
  console.log(`\n完成: ${successCount}/${STORES.length} 个门店成功`)
}

main().catch(console.error)
