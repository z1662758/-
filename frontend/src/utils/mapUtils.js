/**
 * Map Utilities
 * 地图工具函数
 *
 * @author SGM-MSE Team
 * @date 2026-01-13
 */

/**
 * 根据国家获取颜色
 * @param {string} country - 国家名称
 * @returns {string} 十六进制颜色值
 */
export function getCountryColor(country) {
  const colorMap = {
    '中国': '#409EFF',
    '美国': '#67C23A',
    '日本': '#E6A23C',
    '德国': '#F56C6C',
    '英国': '#909399',
    '韩国': '#E6A23C',
    '新加坡': '#67C23A',
    '印度': '#F56C6C',
    '荷兰': '#409EFF',
    '法国': '#909399'
  }
  return colorMap[country] || '#909399'
}

/**
 * 创建港口图标（根据企业数量）
 * @param {number} enterpriseCount - 企业数量
 * @returns {string} SVG图标字符串
 */
export function createPortIcon(enterpriseCount) {
  const size = Math.min(20 + enterpriseCount * 2, 50) // 限制最大尺寸
  const color = enterpriseCount > 10 ? '#F56C6C' : enterpriseCount > 5 ? '#E6A23C' : '#409EFF'

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" opacity="0.8" />
    <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">${enterpriseCount}</text>
  </svg>`
}

/**
 * 计算两点之间的距离（经纬度）
 * @param {number} lon1 - 经度1
 * @param {number} lat1 - 纬度1
 * @param {number} lon2 - 经度2
 * @param {number} lat2 - 纬度2
 * @returns {number} 距离（千米）
 */
export function calculateDistance(lon1, lat1, lon2, lat2) {
  const R = 6371 // 地球半径（千米）
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 角度转弧度
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * 格式化坐标
 * @param {number} coord - 坐标值
 * @param {string} type - 类型（'lon' | 'lat'）
 * @returns {string} 格式化后的坐标字符串
 */
export function formatCoordinate(coord, type) {
  if (!coord) return '-'

  const absCoord = Math.abs(coord)
  const degrees = Math.floor(absCoord)
  const minutes = Math.floor((absCoord - degrees) * 60)
  const seconds = ((absCoord - degrees - minutes / 60) * 3600).toFixed(2)

  const direction = type === 'lon'
    ? (coord >= 0 ? 'E' : 'W')
    : (coord >= 0 ? 'N' : 'S')

  return `${degrees}°${minutes}'${seconds}"${direction}`
}

/**
 * 获取企业类型的颜色
 * @param {string} enterpriseType - 企业类型
 * @returns {string} 十六进制颜色值
 */
export function getEnterpriseTypeColor(enterpriseType) {
  const colorMap = {
    '制造商': '#67C23A',
    '销售商': '#E6A23C',
    '供应商': '#909399'
  }
  return colorMap[enterpriseType] || '#909399'
}

/**
 * 计算聚类圆圈的半径（根据企业数量）
 * @param {number} enterpriseCount - 企业数量
 * @returns {number} 半径（米）
 */
export function calculateClusterRadius(enterpriseCount) {
  // 基础半径10km，每个企业增加2km
  return 10000 + enterpriseCount * 2000
}

/**
 * 将笛卡尔坐标转换为经纬度
 * @param {number} x - X坐标（0-2000）
 * @param {number} y - Y坐标（0-1000）
 * @returns {Array<number>} [longitude, latitude]
 */
export function cartesianToGeo(x, y) {
  // 逆向计算（参考coordinate_mapper.py）
  const lonRange = [0, 145] // 经度范围：0°E - 145°E
  const latRange = [0, 65]  // 纬度范围：0°N - 65°N
  const mapSize = [2000, 1000]

  const longitude = (x / mapSize[0]) * (lonRange[1] - lonRange[0]) + lonRange[0]
  const latitude = (y / mapSize[1]) * (latRange[1] - latRange[0]) + latRange[0]

  return [longitude, latitude]
}

/**
 * 经纬度转换为笛卡尔坐标
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @returns {Array<number>} [x, y]
 */
export function geoToCartesian(longitude, latitude) {
  const lonRange = [0, 145]
  const latRange = [0, 65]
  const mapSize = [2000, 1000]

  const x = ((longitude - lonRange[0]) / (lonRange[1] - lonRange[0])) * mapSize[0]
  const y = ((latitude - latRange[0]) / (latRange[1] - latRange[0])) * mapSize[1]

  return [x, y]
}

/**
 * 判断坐标是否在范围内
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @returns {boolean} 是否在范围内
 */
export function isCoordinateValid(longitude, latitude) {
  return longitude >= 0 && longitude <= 145 && latitude >= 0 && latitude <= 65
}

/**
 * 格式化企业数量显示
 * @param {number} count - 企业数量
 * @returns {string} 格式化后的字符串
 */
export function formatEnterpriseCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return `${count}`
}
