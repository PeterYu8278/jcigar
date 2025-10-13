/**
 * 数字格式化工具
 */

/**
 * 格式化货币
 * @param value - 数值
 * @param currency - 货币符号，默认 'RM'
 * @param decimals - 小数位数，默认 2
 * 
 * @example
 * formatCurrency(1234.5) // "RM 1,234.50"
 * formatCurrency(1234.5, '$') // "$1,234.50"
 * formatCurrency(1234.567, 'RM', 3) // "RM 1,234.567"
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  currency: string = 'RM',
  decimals: number = 2
): string => {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0.${'0'.repeat(decimals)}`
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return `${currency} 0.${'0'.repeat(decimals)}`
  }

  return `${currency} ${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`
}

/**
 * 格式化百分比
 * @param value - 数值（0-100）
 * @param decimals - 小数位数，默认 1
 * 
 * @example
 * formatPercent(12.5) // "12.5%"
 * formatPercent(12.567, 2) // "12.57%"
 */
export const formatPercent = (
  value: number | string | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || value === '') {
    return '0%'
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return '0%'
  }

  return `${num.toFixed(decimals)}%`
}

/**
 * 格式化数字（添加千分位分隔符）
 * @param value - 数值
 * @param decimals - 小数位数，默认 0
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.567, 2) // "1,234.57"
 */
export const formatNumber = (
  value: number | string | null | undefined,
  decimals: number = 0
): string => {
  if (value === null || value === undefined || value === '') {
    return '0'
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return '0'
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认 2
 * 
 * @example
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1048576) // "1.00 MB"
 * formatFileSize(1073741824) // "1.00 GB"
 */
export const formatFileSize = (
  bytes: number | null | undefined,
  decimals: number = 2
): string => {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * 格式化数字为紧凑形式（K, M, B）
 * @param value - 数值
 * @param decimals - 小数位数，默认 1
 * 
 * @example
 * formatCompactNumber(1500) // "1.5K"
 * formatCompactNumber(1500000) // "1.5M"
 * formatCompactNumber(1500000000) // "1.5B"
 */
export const formatCompactNumber = (
  value: number | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || value === 0) {
    return '0'
  }

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`
  }
  if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`
  }
  if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`
  }

  return `${sign}${absValue}`
}

/**
 * 安全转换为数字
 * @param value - 任意值
 * @param defaultValue - 默认值，默认 0
 * 
 * @example
 * toNumber('123') // 123
 * toNumber('abc', 0) // 0
 * toNumber(null, 10) // 10
 */
export const toNumber = (
  value: any,
  defaultValue: number = 0
): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  const num = typeof value === 'string' ? parseFloat(value) : Number(value)

  return isNaN(num) ? defaultValue : num
}

/**
 * 四舍五入到指定小数位
 * @param value - 数值
 * @param decimals - 小数位数
 * 
 * @example
 * round(1.2345, 2) // 1.23
 * round(1.2365, 2) // 1.24
 */
export const round = (
  value: number,
  decimals: number = 0
): number => {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

