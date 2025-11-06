/**
 * 缓存工具
 * 提供内存缓存和持久化缓存功能
 */

import { CACHE_CONFIG } from '../config/constants'

// 缓存项
interface CacheItem<T> {
  value: T
  expiry: number
  timestamp: number
}

// 缓存配置
export interface CacheOptions {
  ttl?: number // 存活时间（毫秒）
  persist?: boolean // 是否持久化
  key?: string // 缓存键名
}

// 内存缓存
class MemoryCache {
  private cache: Map<string, CacheItem<any>>
  private maxItems: number

  constructor(maxItems: number = CACHE_CONFIG.MAX_ITEMS) {
    this.cache = new Map()
    this.maxItems = maxItems
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void {
    // 检查缓存大小
    if (this.cache.size >= this.maxItems) {
      // 删除最旧的项
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    })
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let count = 0
    const now = Date.now()

    this.cache.forEach((item, key) => {
      if (now > item.expiry) {
        this.cache.delete(key)
        count++
      }
    })

    return count
  }
}

// 创建全局缓存实例
export const memoryCache = new MemoryCache()

/**
 * 缓存装饰器
 */
export const cached = <T extends (...args: any[]) => any>(
  fn: T,
  options: CacheOptions = {}
): T => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    persist = false,
    key: customKey
  } = options

  return ((...args: Parameters<T>): ReturnType<T> => {
    // 生成缓存键
    const cacheKey = customKey || `${fn.name}_${JSON.stringify(args)}`

    // 尝试从缓存获取
    const cached = memoryCache.get<ReturnType<T>>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // 执行函数
    const result = fn(...args)

    // 处理 Promise
    if (result instanceof Promise) {
      return result.then((value) => {
        memoryCache.set(cacheKey, value, ttl)
        return value
      }) as ReturnType<T>
    }

    // 缓存结果
    memoryCache.set(cacheKey, result, ttl)
    return result
  }) as T
}

/**
 * 缓存 Hook
 */
export const useCachedValue = <T>(
  key: string,
  fetcher: () => Promise<T> | T,
  options: CacheOptions = {}
): {
  data: T | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
} => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL
  } = options

  const [data, setData] = React.useState<T | null>(() => memoryCache.get<T>(key))
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<Error | null>(null)

  const fetch = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await Promise.resolve(fetcher())
      memoryCache.set(key, result, ttl)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl])

  React.useEffect(() => {
    const cached = memoryCache.get<T>(key)
    if (cached === null) {
      fetch()
    }
  }, [key, fetch])

  return {
    data,
    loading,
    error,
    refresh: fetch
  }
}

/**
 * 请求去重
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>>

  constructor() {
    this.pendingRequests = new Map()
  }

  /**
   * 执行请求（去重）
   */
  async execute<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 检查是否有相同的请求正在执行
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }

    // 执行新请求
    const promise = fetcher()
      .then((result) => {
        this.pendingRequests.delete(key)
        return result
      })
      .catch((error) => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, promise)
    return promise
  }

  /**
   * 取消请求
   */
  cancel(key: string): void {
    this.pendingRequests.delete(key)
  }

  /**
   * 清空所有请求
   */
  clear(): void {
    this.pendingRequests.clear()
  }
}

export const requestDeduplicator = new RequestDeduplicator()

/**
 * 带缓存和去重的请求
 */
export const cachedRequest = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL
  } = options

  // 检查缓存
  const cached = memoryCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // 去重执行请求
  const result = await requestDeduplicator.execute(key, fetcher)

  // 缓存结果
  memoryCache.set(key, result, ttl)

  return result
}

/**
 * 批量缓存操作
 */
export const batchCache = {
  /**
   * 批量设置
   */
  set: <T>(items: Array<{ key: string; value: T; ttl?: number }>): void => {
    items.forEach(({ key, value, ttl }) => {
      memoryCache.set(key, value, ttl)
    })
  },

  /**
   * 批量获取
   */
  get: <T>(keys: string[]): Array<T | null> => {
    return keys.map(key => memoryCache.get<T>(key))
  },

  /**
   * 批量删除
   */
  delete: (keys: string[]): number => {
    let count = 0
    keys.forEach(key => {
      if (memoryCache.delete(key)) {
        count++
      }
    })
    return count
  },

  /**
   * 批量检查
   */
  has: (keys: string[]): boolean[] => {
    return keys.map(key => memoryCache.has(key))
  }
}

/**
 * 缓存统计
 */
export const cacheStats = () => {
  return {
    size: memoryCache.size(),
    keys: memoryCache.keys(),
    maxItems: CACHE_CONFIG.MAX_ITEMS,
    cleanup: () => memoryCache.cleanup()
  }
}

/**
 * 清理过期缓存（定时任务）
 */
if (typeof window !== 'undefined') {
  // 每5分钟清理一次过期缓存
  setInterval(() => {
    const cleaned = memoryCache.cleanup()
    if (cleaned > 0) {
    }
  }, 5 * 60 * 1000)
}

// 导入 React 用于 Hook
import React from 'react'

export default {
  memoryCache,
  cached,
  useCachedValue,
  requestDeduplicator,
  cachedRequest,
  batchCache,
  cacheStats
}
