/**
 * 数据获取 Hook
 * 封装 API 调用，提供统一的数据获取接口
 */

import { useEffect, useRef } from 'react'
import { useAsync, type UseAsyncOptions, type UseAsyncReturn } from './useAsync'

/**
 * 数据获取配置
 */
export interface UseFetchOptions<T> extends UseAsyncOptions<T> {
  /** 依赖项数组，当依赖项变化时重新获取数据 */
  deps?: React.DependencyList
  /** 是否启用（为 false 时不会获取数据） */
  enabled?: boolean
  /** 轮询间隔（毫秒），设置后将自动轮询 */
  pollingInterval?: number
  /** 缓存键，用于缓存数据 */
  cacheKey?: string
  /** 缓存时间（毫秒） */
  cacheTime?: number
}

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()

/**
 * 数据获取 Hook
 * 
 * @param fetchFunction - 数据获取函数
 * @param options - 配置选项
 * @returns 异步状态和操作方法
 * 
 * @example
 * ```tsx
 * // 基础用法
 * const { data, loading, error, refetch } = useFetch(
 *   () => fetchUserList(),
 *   { immediate: true }
 * )
 * 
 * // 带依赖项，当 userId 变化时重新获取
 * const { data, loading } = useFetch(
 *   () => fetchUserDetail(userId),
 *   { deps: [userId] }
 * )
 * 
 * // 条件获取（只在 enabled 为 true 时获取）
 * const { data } = useFetch(
 *   () => fetchData(),
 *   { enabled: isReady }
 * )
 * 
 * // 轮询（每 5 秒获取一次）
 * const { data } = useFetch(
 *   () => fetchStatus(),
 *   { pollingInterval: 5000 }
 * )
 * 
 * // 带缓存
 * const { data } = useFetch(
 *   () => fetchConfig(),
 *   {
 *     cacheKey: 'app-config',
 *     cacheTime: 5 * 60 * 1000 // 5分钟
 *   }
 * )
 * ```
 */
export function useFetch<T>(
  fetchFunction: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseAsyncReturn<T> & { refetch: () => Promise<T | undefined> } {
  const {
    deps = [],
    enabled = true,
    pollingInterval,
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 默认 5 分钟
    immediate = true,
    ...asyncOptions
  } = options

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  /**
   * 包装的获取函数（带缓存）
   */
  const wrappedFetchFunction = async (): Promise<T> => {
    // 检查缓存
    if (cacheKey) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data as T
      }
    }

    // 获取数据
    const data = await fetchFunction()

    // 更新缓存
    if (cacheKey) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
    }

    return data
  }

  const asyncState = useAsync(wrappedFetchFunction, {
    ...asyncOptions,
    immediate: false
  })

  const { execute } = asyncState

  /**
   * 清除轮询定时器
   */
  const clearPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }

  /**
   * 开始轮询
   */
  const startPolling = () => {
    if (!pollingInterval || !enabled) return

    clearPolling()
    pollingTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        execute()
      }
    }, pollingInterval)
  }

  /**
   * 重新获取数据
   */
  const refetch = async (): Promise<T | undefined> => {
    // 清除缓存
    if (cacheKey) {
      cache.delete(cacheKey)
    }
    return execute()
  }

  /**
   * 初始化和依赖项变化时获取数据
   */
  useEffect(() => {
    if (enabled && immediate) {
      execute()
    }

    // 启动轮询
    if (enabled && pollingInterval) {
      startPolling()
    }

    return () => {
      clearPolling()
    }
  }, [enabled, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 清理
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false
      clearPolling()
    }
  }, [])

  return {
    ...asyncState,
    refetch
  }
}

/**
 * 无限滚动数据获取 Hook
 * 
 * @param fetchFunction - 数据获取函数，接收 page 参数
 * @param options - 配置选项
 * @returns 无限滚动状态和操作方法
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   hasMore,
 *   loadMore
 * } = useInfiniteFetch(
 *   (page) => fetchUserList({ page, pageSize: 20 }),
 *   { immediate: true }
 * )
 * 
 * <InfiniteScroll
 *   dataLength={data.length}
 *   next={loadMore}
 *   hasMore={hasMore}
 *   loader={<Spin />}
 * >
 *   {data.map(item => <Item key={item.id} data={item} />)}
 * </InfiniteScroll>
 * ```
 */
export function useInfiniteFetch<T>(
  fetchFunction: (page: number) => Promise<T[]>,
  options: Omit<UseFetchOptions<T[]>, 'initialData'> = {}
) {
  const pageRef = useRef(1)
  const allDataRef = useRef<T[]>([])
  const hasMoreRef = useRef(true)

  const { data, loading, error, execute, reset } = useAsync(
    async () => {
      const newData = await fetchFunction(pageRef.current)
      
      if (newData.length === 0) {
        hasMoreRef.current = false
      } else {
        allDataRef.current = [...allDataRef.current, ...newData]
        pageRef.current++
      }

      return allDataRef.current
    },
    {
      ...options,
      initialData: []
    }
  )

  /**
   * 加载更多
   */
  const loadMore = async () => {
    if (!loading && hasMoreRef.current) {
      await execute()
    }
  }

  /**
   * 重置并重新加载
   */
  const reload = async () => {
    pageRef.current = 1
    allDataRef.current = []
    hasMoreRef.current = true
    reset()
    await execute()
  }

  /**
   * 初始加载
   */
  useEffect(() => {
    if (options.immediate !== false) {
      execute()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: data || [],
    loading,
    error,
    hasMore: hasMoreRef.current,
    loadMore,
    reload
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  cache.clear()
}

/**
 * 清除指定缓存
 */
export function clearCache(cacheKey: string) {
  cache.delete(cacheKey)
}

export default useFetch

