// 服务端分页 Hook
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Query, DocumentData, QueryDocumentSnapshot, limit, startAfter, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import type { FirestoreError } from 'firebase/firestore'

export interface ServerPaginationConfig {
  pageSize: number
  mobilePageSize?: number
  orderByField: string
  orderByDirection?: 'asc' | 'desc'
  initialLoad?: boolean
}

export interface ServerPaginationResult<T> {
  data: T[]
  loading: boolean
  error: FirestoreError | null
  hasMore: boolean
  currentPage: number
  totalPages: number | null
  total: number | null // null 表示未知总数
  loadPage: (page: number) => Promise<void>
  loadNext: () => Promise<void>
  loadPrevious: () => Promise<void>
  refresh: () => Promise<void>
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
 * 服务端分页 Hook
 * 
 * @param queryBuilder - 构建 Firestore 查询的函数
 * @param config - 分页配置
 * @param dataMapper - 将 Firestore 文档映射为应用数据类型的函数
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   hasMore,
 *   loadPage,
 *   currentPage
 * } = useServerPagination(
 *   (pageSize, lastDoc) => {
 *     let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize))
 *     if (lastDoc) {
 *       q = query(q, startAfter(lastDoc))
 *     }
 *     return q
 *   },
 *   {
 *     pageSize: 20,
 *     mobilePageSize: 10,
 *     orderByField: 'createdAt',
 *     orderByDirection: 'desc'
 *   },
 *   (doc) => ({ id: doc.id, ...doc.data() } as User)
 * )
 * ```
 */
export function useServerPagination<T = DocumentData>(
  queryBuilder: (pageSize: number, lastDoc: QueryDocumentSnapshot<DocumentData> | null) => Query<DocumentData>,
  config: ServerPaginationConfig,
  dataMapper: (doc: QueryDocumentSnapshot<DocumentData>) => T
): ServerPaginationResult<T> {
  const {
    pageSize: desktopPageSize,
    mobilePageSize = Math.floor(desktopPageSize * 0.5),
    orderByField,
    orderByDirection = 'desc',
    initialLoad = true
  } = config

  const [isMobile, setIsMobile] = useState(isMobileDevice)
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<FirestoreError | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [pageDocs, setPageDocs] = useState<Map<number, QueryDocumentSnapshot<DocumentData> | null>>(new Map())
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | null>(null)

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
  const loadPage = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)

    try {
      // 如果请求的是第一页，重置状态
      if (page === 1) {
        setData([])
        setLastDoc(null)
        setPageDocs(new Map())
        setPageDocs(prev => {
          const newMap = new Map(prev)
          newMap.set(1, null)
          return newMap
        })
      }

      // 获取上一页的最后一个文档作为起始点
      const prevPage = page - 1
      const startAfterDoc = pageDocs.get(prevPage) || null

      // 构建查询
      const q = queryBuilder(pageSize, startAfterDoc)

      // 执行查询
      const snapshot = await getDocs(q)

      // 映射数据
      const newData = snapshot.docs.map(dataMapper)

      // 更新状态
      setData(newData)
      setCurrentPage(page)
      setHasMore(snapshot.docs.length === pageSize)

      // 保存当前页的最后一个文档
      if (snapshot.docs.length > 0) {
        const lastDocument = snapshot.docs[snapshot.docs.length - 1]
        setLastDoc(lastDocument)
        setPageDocs(prev => {
          const newMap = new Map(prev)
          newMap.set(page, lastDocument)
          return newMap
        })
      } else {
        setHasMore(false)
      }

      // 如果是第一页，尝试获取总数（可选，可能影响性能）
      if (page === 1 && snapshot.docs.length < pageSize) {
        setTotal(snapshot.docs.length)
      }
    } catch (err) {
      const firestoreError = err as FirestoreError
      setError(firestoreError)
      console.error('[useServerPagination] 加载失败:', firestoreError)
    } finally {
      setLoading(false)
    }
  }, [queryBuilder, pageSize, dataMapper, pageDocs])

  // 加载下一页
  const loadNext = useCallback(async () => {
    if (hasMore && !loading) {
      await loadPage(currentPage + 1)
    }
  }, [hasMore, loading, currentPage, loadPage])

  // 加载上一页
  const loadPrevious = useCallback(async () => {
    if (currentPage > 1 && !loading) {
      await loadPage(currentPage - 1)
    }
  }, [currentPage, loading, loadPage])

  // 刷新当前页
  const refresh = useCallback(async () => {
    await loadPage(currentPage)
  }, [currentPage, loadPage])

  // 重置分页
  const reset = useCallback(() => {
    setData([])
    setCurrentPage(1)
    setLastDoc(null)
    setPageDocs(new Map())
    setHasMore(true)
    setError(null)
    setTotal(null)
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
      loadPage(1)
    }
  }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // 计算总页数（如果知道总数）
  const totalPages = useMemo(() => {
    if (total === null) return null
    return Math.ceil(total / pageSize)
  }, [total, pageSize])

  return {
    data,
    loading,
    error,
    hasMore,
    currentPage,
    totalPages,
    total,
    loadPage,
    loadNext,
    loadPrevious,
    refresh,
    reset
  }
}

