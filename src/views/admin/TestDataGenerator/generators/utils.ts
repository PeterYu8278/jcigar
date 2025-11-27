/**
 * 递归清理对象中的 undefined 值
 * Firestore 不支持 undefined，需要移除或转换为 null
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as any
  }
  
  const cleaned: any = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = removeUndefined(obj[key])
    }
  }
  return cleaned as T
}

