// 替代约 30 个视图中重复的 loading/data/error + useEffect 手动模式

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ServiceResponse } from '../types/api'

interface UseFirestoreQueryOptions {
  // 默认立即执行；设为 false 可手动触发
  immediate?: boolean
}

interface UseFirestoreQueryResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refresh: () => void
}

// 支持两种返回格式：
//   1. { success, data[], error } — 新标准 ServiceResponse 格式
//   2. T[]                       — 项目现有读取函数的直接返回格式
type FetchFn<T> =
  | (() => Promise<ServiceResponse<T[]>>)
  | (() => Promise<T[]>)

function isServiceResponse<T>(val: unknown): val is ServiceResponse<T[]> {
  return (
    val !== null &&
    typeof val === 'object' &&
    'success' in (val as object)
  )
}

/**
 * 通用 Firestore 列表查询 Hook
 *
 * 同时支持两种 fetch 函数返回格式：
 *   - 直接返回数组：const { data } = useFirestoreQuery(getUsers)
 *   - ServiceResponse 格式：const { data } = useFirestoreQuery(getUsersPaginated)
 *   - 带依赖项：const { data } = useFirestoreQuery(() => getOrdersByUser(userId), [userId])
 */
export function useFirestoreQuery<T>(
  fetchFn: FetchFn<T>,
  deps: unknown[] = [],
  options: UseFirestoreQueryOptions = {}
): UseFirestoreQueryResult<T> {
  const { immediate = true } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  // 防止组件卸载后 setState
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const run = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const result = await (fetchFn as () => Promise<unknown>)()
      if (!mountedRef.current) return

      if (isServiceResponse<T>(result)) {
        // { success, data[], error } 格式
        if (result.success && result.data !== undefined) {
          setData(result.data)
        } else {
          setError(result.error ? String(result.error) : '加载失败')
        }
      } else if (Array.isArray(result)) {
        // 直接数组格式
        setData(result as T[])
      } else {
        setError('返回数据格式不支持')
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(String(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (immediate) run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { data, loading, error, refresh: run }
}

/**
 * 单条记录查询 Hook
 *
 * 支持两种返回格式：T | null 或 { success, data: T }
 *
 * 用法：
 *   const { data: user, loading } = useFirestoreDoc(() => getUser(userId), [userId])
 */
export function useFirestoreDoc<T>(
  fetchFn: () => Promise<T | null | ServiceResponse<T>>,
  deps: unknown[] = [],
  options: UseFirestoreQueryOptions = {}
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const { immediate = true } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const run = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (!mountedRef.current) return

      if (result !== null && typeof result === 'object' && 'success' in (result as object)) {
        const sr = result as ServiceResponse<T>
        if (sr.success && sr.data !== undefined) {
          setData(sr.data)
        } else {
          setError(sr.error ? String(sr.error) : '加载失败')
        }
      } else {
        setData(result as T | null)
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(String(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (immediate) run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { data, loading, error, refresh: run }
}
