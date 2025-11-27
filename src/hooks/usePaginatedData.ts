// 简化的分页数据 Hook（配合 paginatedQueries 使用）
import { useState, useCallback, useEffect, useMemo } from 'react'
import { QueryDocumentSnapshot } from 'firebase/firestore'

export interface PaginatedDataConfig {
  pageSize: number
  mobilePageSize?: number
  initialLoad?: boolean
}

export interface PaginatedDataResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  currentPage: number
  loadPage: (page: number, filters?: any) => Promise<void>
  loadNext: (filters?: any) => Promise<void>
  refresh: (filters?: any) => Promise<void>
  reset: () => void
}

/**
 * 检测是否为移动端
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches
}

/**
 * 分页数据 Hook
 * 
 * @param fetchFunction - 获取数据的函数，接收 (pageSize, lastDoc, filters) 参数
 * @param config - 配置选项
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   hasMore,
 *   loadPage,
 *   currentPage
 * } = usePaginatedData(
 *   (pageSize, lastDoc, filters) => getUsersPaginated(pageSize, lastDoc, filters),
 *   {
 *     pageSize: 20,
 *     mobilePageSize: 10
 *   }
 * )
 * ```
 */
export function usePaginatedData<T>(
  fetchFunction: (
    pageSize: number,
    lastDoc: QueryDocumentSnapshot | null,
    filters?: any
  ) => Promise<{
    data: T[]
    lastDoc: QueryDocumentSnapshot | null
    hasMore: boolean
  }>,
  config: PaginatedDataConfig
): PaginatedDataResult<T> {
  const {
    pageSize: desktopPageSize,
    mobilePageSize = Math.floor(desktopPageSize * 0.5),
    initialLoad = true
  } = config

  const [isMobile, setIsMobile] = useState(isMobileDevice)
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [pageDocs, setPageDocs] = useState<Map<number, QueryDocumentSnapshot | null>>(new Map())
  const [hasMore, setHasMore] = useState(true)
  const [currentFilters, setCurrentFilters] = useState<any>(null)

  // 响应式页面大小
  const pageSize = useMemo(() => {
    return isMobile ? mobilePageSize : desktopPageSize
  }, [isMobile, mobilePageSize, desktopPageSize])

  // 检测移动端变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 加载指定页面
  const loadPage = useCallback(async (page: number, filters?: any) => {
    setLoading(true)
    setError(null)

    try {
      // 如果请求的是第一页或筛选条件变化，重置状态
      if (page === 1 || JSON.stringify(filters) !== JSON.stringify(currentFilters)) {
        setData([])
        setLastDoc(null)
        setPageDocs(new Map())
        setPageDocs(prev => {
          const newMap = new Map(prev)
          newMap.set(1, null)
          return newMap
        })
        setCurrentFilters(filters)
      }

      // 获取上一页的最后一个文档作为起始点
      const prevPage = page - 1
      const startAfterDoc = pageDocs.get(prevPage) || null

      // 执行查询
      const result = await fetchFunction(pageSize, startAfterDoc, filters)

      // 更新状态
      setData(result.data)
      setCurrentPage(page)
      setHasMore(result.hasMore)
      setLastDoc(result.lastDoc)

      // 保存当前页的最后一个文档
      if (result.lastDoc) {
        setPageDocs(prev => {
          const newMap = new Map(prev)
          newMap.set(page, result.lastDoc)
          return newMap
        })
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('[usePaginatedData] 加载失败:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFunction, pageSize, pageDocs, currentFilters])

  // 加载下一页
  const loadNext = useCallback(async (filters?: any) => {
    if (hasMore && !loading) {
      await loadPage(currentPage + 1, filters)
    }
  }, [hasMore, loading, currentPage, loadPage])

  // 刷新当前页
  const refresh = useCallback(async (filters?: any) => {
    await loadPage(currentPage, filters)
  }, [currentPage, loadPage])

  // 重置分页
  const reset = useCallback(() => {
    setData([])
    setCurrentPage(1)
    setLastDoc(null)
    setPageDocs(new Map())
    setHasMore(true)
    setError(null)
    setCurrentFilters(null)
  }, [])

  // 初始加载
  useEffect(() => {
    if (initialLoad) {
      loadPage(1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 页面大小变化时重新加载
  useEffect(() => {
    if (initialLoad && data.length > 0) {
      reset()
      loadPage(1, currentFilters)
    }
  }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    hasMore,
    currentPage,
    loadPage,
    loadNext,
    refresh,
    reset
  }
}

