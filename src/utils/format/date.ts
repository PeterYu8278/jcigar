/**
 * 日期格式化工具
 */

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// 扩展 dayjs 插件
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.extend(utc)

/**
 * 日期格式常量
 */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATE_CN: 'YYYY年MM月DD日',
  TIME: 'HH:mm:ss',
  TIME_SHORT: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'YYYY-MM-DD HH:mm',
  DATETIME_CN: 'YYYY年MM月DD日 HH:mm:ss',
  MONTH: 'YYYY-MM',
  MONTH_CN: 'YYYY年MM月',
  YEAR: 'YYYY',
  YEAR_CN: 'YYYY年'
} as const

/**
 * 格式化日期
 * @param date - 日期对象、时间戳或日期字符串
 * @param format - 格式，默认 'YYYY-MM-DD HH:mm:ss'
 * 
 * @example
 * formatDate(new Date()) // "2024-01-01 12:00:00"
 * formatDate(new Date(), 'YYYY-MM-DD') // "2024-01-01"
 * formatDate(1672531200000) // "2024-01-01 00:00:00"
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  format: string = DATE_FORMATS.DATETIME
): string => {
  if (!date) return '-'
  
  try {
    return dayjs(date).format(format)
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化相对时间（多久前）
 * @param date - 日期对象、时间戳或日期字符串
 * @param locale - 语言，默认 'zh-cn'
 * 
 * @example
 * formatRelativeTime(Date.now() - 60000) // "1分钟前"
 * formatRelativeTime(Date.now() - 3600000) // "1小时前"
 * formatRelativeTime(Date.now() - 86400000) // "1天前"
 */
export const formatRelativeTime = (
  date: Date | string | number | null | undefined,
  locale: string = 'zh-cn'
): string => {
  if (!date) return '-'
  
  try {
    dayjs.locale(locale)
    return dayjs(date).fromNow()
  } catch (error) {
    return '-'
  }
}

/**
 * 格式化日期范围
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param format - 格式，默认 'YYYY-MM-DD'
 * @param separator - 分隔符，默认 ' ~ '
 * 
 * @example
 * formatDateRange(new Date('2024-01-01'), new Date('2024-01-31'))
 * // "2024-01-01 ~ 2024-01-31"
 */
export const formatDateRange = (
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined,
  format: string = DATE_FORMATS.DATE,
  separator: string = ' ~ '
): string => {
  if (!startDate && !endDate) return '-'
  if (!startDate) return `- ${separator} ${formatDate(endDate, format)}`
  if (!endDate) return `${formatDate(startDate, format)} ${separator} -`
  
  return `${formatDate(startDate, format)}${separator}${formatDate(endDate, format)}`
}

/**
 * 计算两个日期之间的天数差
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * 
 * @example
 * getDaysDiff(new Date('2024-01-01'), new Date('2024-01-10')) // 9
 */
export const getDaysDiff = (
  startDate: Date | string | number,
  endDate: Date | string | number
): number => {
  try {
    return dayjs(endDate).diff(dayjs(startDate), 'day')
  } catch (error) {
    return 0
  }
}

/**
 * 判断日期是否为今天
 * @param date - 日期
 * 
 * @example
 * isToday(new Date()) // true
 */
export const isToday = (date: Date | string | number): boolean => {
  try {
    return dayjs(date).isSame(dayjs(), 'day')
  } catch (error) {
    return false
  }
}

/**
 * 判断日期是否为昨天
 * @param date - 日期
 * 
 * @example
 * isYesterday(new Date(Date.now() - 86400000)) // true
 */
export const isYesterday = (date: Date | string | number): boolean => {
  try {
    return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
  } catch (error) {
    return false
  }
}

/**
 * 判断日期是否为本周
 * @param date - 日期
 * 
 * @example
 * isThisWeek(new Date()) // true
 */
export const isThisWeek = (date: Date | string | number): boolean => {
  try {
    return dayjs(date).isSame(dayjs(), 'week')
  } catch (error) {
    return false
  }
}

/**
 * 判断日期是否为本月
 * @param date - 日期
 * 
 * @example
 * isThisMonth(new Date()) // true
 */
export const isThisMonth = (date: Date | string | number): boolean => {
  try {
    return dayjs(date).isSame(dayjs(), 'month')
  } catch (error) {
    return false
  }
}

/**
 * 获取友好的日期显示
 * 今天显示"今天 HH:mm"，昨天显示"昨天 HH:mm"，否则显示完整日期
 * 
 * @param date - 日期
 * 
 * @example
 * getFriendlyDate(new Date()) // "今天 12:30"
 * getFriendlyDate(new Date(Date.now() - 86400000)) // "昨天 15:20"
 * getFriendlyDate(new Date('2024-01-01')) // "2024-01-01 10:00"
 */
export const getFriendlyDate = (
  date: Date | string | number | null | undefined
): string => {
  if (!date) return '-'
  
  try {
    const d = dayjs(date)
    
    if (isToday(date)) {
      return `今天 ${d.format('HH:mm')}`
    }
    
    if (isYesterday(date)) {
      return `昨天 ${d.format('HH:mm')}`
    }
    
    // 本年内不显示年份
    if (d.year() === dayjs().year()) {
      return d.format('MM-DD HH:mm')
    }
    
    return d.format('YYYY-MM-DD HH:mm')
  } catch (error) {
    return '-'
  }
}

/**
 * 获取日期的开始时间（00:00:00）
 * @param date - 日期
 * 
 * @example
 * getStartOfDay(new Date('2024-01-15 15:30:00')) // 2024-01-15 00:00:00
 */
export const getStartOfDay = (date: Date | string | number): Date => {
  return dayjs(date).startOf('day').toDate()
}

/**
 * 获取日期的结束时间（23:59:59）
 * @param date - 日期
 * 
 * @example
 * getEndOfDay(new Date('2024-01-15 15:30:00')) // 2024-01-15 23:59:59
 */
export const getEndOfDay = (date: Date | string | number): Date => {
  return dayjs(date).endOf('day').toDate()
}

/**
 * 添加时间
 * @param date - 日期
 * @param amount - 数量
 * @param unit - 单位
 * 
 * @example
 * addTime(new Date(), 1, 'day') // 明天
 * addTime(new Date(), -1, 'month') // 上个月
 */
export const addTime = (
  date: Date | string | number,
  amount: number,
  unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
): Date => {
  return dayjs(date).add(amount, unit).toDate()
}

/**
 * 减去时间
 * @param date - 日期
 * @param amount - 数量
 * @param unit - 单位
 * 
 * @example
 * subtractTime(new Date(), 1, 'day') // 昨天
 * subtractTime(new Date(), 1, 'month') // 上个月
 */
export const subtractTime = (
  date: Date | string | number,
  amount: number,
  unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
): Date => {
  return dayjs(date).subtract(amount, unit).toDate()
}

