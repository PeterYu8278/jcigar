// Firestore 数据清洗与日期转换工具
// 从 firestore.ts 中提取，便于单独测试和复用

/**
 * 清洗写入 Firestore 的数据：
 * - 移除所有 undefined 字段
 * - 将 Firestore Timestamp 转换为 JS Date
 * - 深拷贝数组和嵌套对象
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeForFirestore = (input: unknown): any => {
  if (input === undefined) return undefined
  if (input === null) return null

  // Firestore Timestamp → Date
  if (
    input !== null &&
    typeof input === 'object' &&
    'toDate' in input &&
    typeof (input as { toDate: unknown }).toDate === 'function'
  ) {
    const d = (input as { toDate: () => Date }).toDate()
    return d instanceof Date && !isNaN(d.getTime()) ? d : undefined
  }

  // Date 原样返回
  if (input instanceof Date) {
    return !isNaN(input.getTime()) ? input : undefined
  }

  // 原始类型
  if (typeof input !== 'object') return input

  // 数组
  if (Array.isArray(input)) {
    return input.map(sanitizeForFirestore).filter(v => v !== undefined)
  }

  // 对象
  const result: Record<string, unknown> = {}
  Object.keys(input as object).forEach(key => {
    const value = sanitizeForFirestore((input as Record<string, unknown>)[key])
    if (value !== undefined) {
      result[key] = value
    }
  })
  return result
}

/**
 * 将任意值转换为 JS Date，无法转换则返回 null
 */
export const toDateOrNull = (val: unknown): Date | null => {
  if (!val) return null

  if (
    val !== null &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: unknown }).toDate === 'function'
  ) {
    const d = (val as { toDate: () => Date }).toDate()
    return isNaN(d?.getTime?.() ?? NaN) ? null : d
  }

  if (val instanceof Date) return isNaN(val.getTime()) ? null : val

  const d = new Date(val as string | number)
  return isNaN(d.getTime()) ? null : d
}

/**
 * 递归将对象中所有 Firestore Timestamp 转换为 JS Date
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertFirestoreTimestamps = <T>(data: T): T => {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  if (d.toDate && typeof d.toDate === 'function') {
    return d.toDate() as unknown as T
  }

  if (Array.isArray(data)) {
    return data.map(convertFirestoreTimestamps) as unknown as T
  }

  const result: Record<string, unknown> = {}
  Object.keys(data as object).forEach(key => {
    result[key] = convertFirestoreTimestamps((data as Record<string, unknown>)[key])
  })
  return result as T
}
