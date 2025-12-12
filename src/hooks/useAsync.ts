/**
 * 异步操作 Hook
 * 统一管理异步操作的 loading、error、data 状态
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 异步状态
 */
export interface AsyncState<T> {
  /** 加载中 */
  loading: boolean
  /** 错误信息 */
  error: Error | null
  /** 数据 */
  data: T | null
  /** 状态：idle（空闲）、loading（加载中）、success（成功）、error（失败） */
  status: 'idle' | 'loading' | 'success' | 'error'
}

/**
 * 异步操作 Hook 配置
 */
export interface UseAsyncOptions<T> {
  /** 初始数据 */
  initialData?: T
  /** 是否立即执行 */
  immediate?: boolean
  /** 成功回调 */
  onSuccess?: (data: T) => void
  /** 失败回调 */
  onError?: (error: Error) => void
  /** 重试次数 */
  retryCount?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
}

/**
 * 异步操作 Hook 返回值
 */
export interface UseAsyncReturn<T> extends AsyncState<T> {
  /** 执行异步操作 */
  execute: (...args: any[]) => Promise<T | undefined>
  /** 重置状态 */
  reset: () => void
  /** 设置数据 */
  setData: (data: T | null) => void
  /** 设置错误 */
  setError: (error: Error | null) => void
  /** 重试 */
  retry: () => Promise<T | undefined>
}

/**
 * 异步操作 Hook
 * 
 * @param asyncFunction - 异步函数
 * @param options - 配置选项
 * @returns 异步状态和操作方法
 * 
 * @example
 * ```tsx
 * const {
 *   loading,
 *   error,
 *   data,
 *   execute,
 *   reset
 * } = useAsync(
 *   async (userId: string) => {
 *     const response = await fetchUser(userId)
 *     return response.data
 *   },
 *   {
 *     immediate: false,
 *     onSuccess: (data) => message.success('加载成功'),
 *     onError: (error) => message.error(error.message)
 *   }
 * )
 * 
 * // 手动执行
 * <Button onClick={() => execute('123')}>加载用户</Button>
 * 
 * // 显示状态
 * {loading && <Spin />}
 * {error && <Alert type="error" message={error.message} />}
 * {data && <UserCard user={data} />}
 * ```
 */
export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const {
    initialData = null,
    immediate = false,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options

  // 状态
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: initialData as T | null,
    status: 'idle'
  })

  // 引用
  const mountedRef = useRef(true)
  const lastArgsRef = useRef<Args | null>(null)
  const retryCountRef = useRef(0)

  /**
   * 设置状态（仅在组件挂载时）
   */
  const setSafeState = useCallback((newState: Partial<AsyncState<T>>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...newState }))
    }
  }, [])

  /**
   * 执行异步操作
   */
  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      lastArgsRef.current = args
      retryCountRef.current = 0

      setSafeState({
        loading: true,
        error: null,
        status: 'loading'
      })

      try {
        const data = await asyncFunction(...args)
        
        setSafeState({
          loading: false,
          data,
          status: 'success'
        })

        if (onSuccess) {
          onSuccess(data)
        }

        return data
      } catch (error) {
        const err = error as Error

        setSafeState({
          loading: false,
          error: err,
          status: 'error'
        })

        if (onError) {
          onError(err)
        }

        // 自动重试
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return execute(...args)
        }

        return undefined
      }
    },
    [asyncFunction, onSuccess, onError, retryCount, retryDelay, setSafeState]
  )

  /**
   * 重试
   */
  const retry = useCallback(async (): Promise<T | undefined> => {
    if (lastArgsRef.current) {
      return execute(...lastArgsRef.current)
    }
    return undefined
  }, [execute])

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setSafeState({
      loading: false,
      error: null,
      data: initialData as T | null,
      status: 'idle'
    })
    lastArgsRef.current = null
    retryCountRef.current = 0
  }, [initialData, setSafeState])

  /**
   * 设置数据
   */
  const setData = useCallback(
    (data: T | null) => {
      setSafeState({ data })
    },
    [setSafeState]
  )

  /**
   * 设置错误
   */
  const setError = useCallback(
    (error: Error | null) => {
      setSafeState({ error })
    },
    [setSafeState]
  )

  // 立即执行
  useEffect(() => {
    if (immediate) {
      execute(...([] as any))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    retry
  }
}

/**
 * 异步回调 Hook
 * 简化版的 useAsync，用于事件处理
 * 
 * @param asyncFunction - 异步函数
 * @returns [execute, loading, error]
 * 
 * @example
 * ```tsx
 * const [handleSubmit, submitting, error] = useAsyncCallback(
 *   async (formData) => {
 *     await saveData(formData)
 *   }
 * )
 * 
 * <Button onClick={() => handleSubmit(data)} loading={submitting}>
 *   提交
 * </Button>
 * ```
 */
export function useAsyncCallback<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>
): [(...args: Args) => Promise<T | undefined>, boolean, Error | null] {
  const { execute, loading, error } = useAsync(asyncFunction, { immediate: false })
  return [execute, loading, error]
}

export default useAsync

