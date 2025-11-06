/**
 * 数字格式化工具
 */

// 货币格式化选项
export interface CurrencyOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

// 数字格式化选项
export interface NumberOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  useGrouping?: boolean
  locale?: string
}

/**
 * 格式化货币
 * @param amount 金额
 * @param options 格式化选项
 * @returns 格式化后的货币字符串
 * 
 * @example
 * formatCurrency(1234.56) // "RM 1,234.56"
 * formatCurrency(1234.56, { currency: 'USD' }) // "$ 1,234.56"
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  options: CurrencyOptions = {}
): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '-'
  }
  
  const {
    currency = 'MYR',
    locale = 'en-MY',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options
  
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    if (isNaN(numAmount)) {
      return '-'
    }
    
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    })
    
    // 自定义货币符号
    if (currency === 'MYR') {
      return `RM ${numAmount.toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits
      })}`
    }
    
    return formatter.format(numAmount)
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化数字
 * @param number 数字
 * @param options 格式化选项
 * @returns 格式化后的数字字符串
 * 
 * @example
 * formatNumber(1234.56) // "1,234.56"
 * formatNumber(1234.56, { maximumFractionDigits: 0 }) // "1,235"
 */
export const formatNumber = (
  number: number | string | null | undefined,
  options: NumberOptions = {}
): string => {
  if (number === null || number === undefined || number === '') {
    return '-'
  }
  
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true,
    locale = 'en-MY'
  } = options
  
  try {
    const num = typeof number === 'string' ? parseFloat(number) : number
    
    if (isNaN(num)) {
      return '-'
    }
    
    return num.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    })
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化百分比
 * @param number 数字
 * @param options 格式化选项
 * @returns 格式化后的百分比字符串
 * 
 * @example
 * formatPercentage(0.1234) // "12.34%"
 * formatPercentage(0.1234, { maximumFractionDigits: 1 }) // "12.3%"
 */
export const formatPercentage = (
  number: number | string | null | undefined,
  options: NumberOptions = {}
): string => {
  if (number === null || number === undefined || number === '') {
    return '-'
  }
  
  const {
    minimumFractionDigits = 1,
    maximumFractionDigits = 2,
    locale = 'en-MY'
  } = options
  
  try {
    const num = typeof number === 'string' ? parseFloat(number) : number
    
    if (isNaN(num)) {
      return '-'
    }
    
    // 如果数字小于1，假设是小数形式（如0.1234）
    const percentage = num < 1 ? num * 100 : num
    
    return `${percentage.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    })}%`
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param options 格式化选项
 * @returns 格式化后的文件大小字符串
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export const formatFileSize = (
  bytes: number | string | null | undefined,
  options: { locale?: string } = {}
): string => {
  if (bytes === null || bytes === undefined || bytes === '') {
    return '-'
  }
  
  const { locale = 'en-MY' } = options
  
  try {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes
    
    if (isNaN(numBytes) || numBytes < 0) {
      return '-'
    }
    
    if (numBytes === 0) {
      return '0 B'
    }
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    const k = 1024
    const i = Math.floor(Math.log(numBytes) / Math.log(k))
    
    const size = numBytes / Math.pow(k, i)
    
    return `${size.toLocaleString(locale, {
      maximumFractionDigits: 1
    })} ${units[i]}`
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化数量
 * @param count 数量
 * @param unit 单位
 * @param options 格式化选项
 * @returns 格式化后的数量字符串
 * 
 * @example
 * formatQuantity(1234, '件') // "1,234 件"
 * formatQuantity(1234, 'sticks') // "1,234 sticks"
 */
export const formatQuantity = (
  count: number | string | null | undefined,
  unit: string = '',
  options: NumberOptions = {}
): string => {
  if (count === null || count === undefined || count === '') {
    return '-'
  }
  
  const formattedNumber = formatNumber(count, options)
  
  if (formattedNumber === '-') {
    return '-'
  }
  
  return unit ? `${formattedNumber} ${unit}` : formattedNumber
}

/**
 * 格式化距离
 * @param distance 距离（米）
 * @param options 格式化选项
 * @returns 格式化后的距离字符串
 * 
 * @example
 * formatDistance(1500) // "1.5 km"
 * formatDistance(500) // "500 m"
 */
export const formatDistance = (
  distance: number | string | null | undefined,
  options: { locale?: string } = {}
): string => {
  if (distance === null || distance === undefined || distance === '') {
    return '-'
  }
  
  const { locale = 'en-MY' } = options
  
  try {
    const numDistance = typeof distance === 'string' ? parseFloat(distance) : distance
    
    if (isNaN(numDistance) || numDistance < 0) {
      return '-'
    }
    
    if (numDistance >= 1000) {
      const km = numDistance / 1000
      return `${km.toLocaleString(locale, {
        maximumFractionDigits: 1
      })} km`
    }
    
    return `${Math.round(numDistance)} m`
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化温度
 * @param temperature 温度
 * @param unit 单位 ('C' | 'F')
 * @param options 格式化选项
 * @returns 格式化后的温度字符串
 * 
 * @example
 * formatTemperature(25.5, 'C') // "25.5°C"
 * formatTemperature(77.9, 'F') // "77.9°F"
 */
export const formatTemperature = (
  temperature: number | string | null | undefined,
  unit: 'C' | 'F' = 'C',
  options: NumberOptions = {}
): string => {
  if (temperature === null || temperature === undefined || temperature === '') {
    return '-'
  }
  
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 1,
    locale = 'en-MY'
  } = options
  
  try {
    const numTemp = typeof temperature === 'string' ? parseFloat(temperature) : temperature
    
    if (isNaN(numTemp)) {
      return '-'
    }
    
    const formatted = numTemp.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    })
    
    return `${formatted}°${unit}`
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化分数
 * @param numerator 分子
 * @param denominator 分母
 * @param options 格式化选项
 * @returns 格式化后的分数字符串
 * 
 * @example
 * formatFraction(3, 4) // "3/4"
 * formatFraction(1, 2) // "1/2"
 */
export const formatFraction = (
  numerator: number | string | null | undefined,
  denominator: number | string | null | undefined,
  options: { locale?: string } = {}
): string => {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return '-'
  }
  
  try {
    const num = typeof numerator === 'string' ? parseFloat(numerator) : numerator
    const den = typeof denominator === 'string' ? parseFloat(denominator) : denominator
    
    if (isNaN(num) || isNaN(den) || den === 0) {
      return '-'
    }
    
    return `${Math.round(num)}/${Math.round(den)}`
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化比率
 * @param numerator 分子
 * @param denominator 分母
 * @param options 格式化选项
 * @returns 格式化后的比率字符串
 * 
 * @example
 * formatRatio(3, 4) // "3:4"
 * formatRatio(1, 2) // "1:2"
 */
export const formatRatio = (
  numerator: number | string | null | undefined,
  denominator: number | string | null | undefined,
  options: { locale?: string } = {}
): string => {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return '-'
  }
  
  try {
    const num = typeof numerator === 'string' ? parseFloat(numerator) : numerator
    const den = typeof denominator === 'string' ? parseFloat(denominator) : denominator
    
    if (isNaN(num) || isNaN(den) || den === 0) {
      return '-'
    }
    
    // 简化比率
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const divisor = gcd(Math.round(num), Math.round(den))
    
    return `${Math.round(num) / divisor}:${Math.round(den) / divisor}`
  } catch (error) {
    return '-'
  }
}
