// 内嵌的简化世界地图 GeoJSON（FeatureCollection），确保离线可用
import WORLD_GEO_JSON from '@/assets/data/world.json'

let worldMapRegistered = false

export async function ensureEchartsWorldMap(echarts) {
  if (worldMapRegistered) return
  echarts.registerMap('world', WORLD_GEO_JSON)
  worldMapRegistered = true
}
