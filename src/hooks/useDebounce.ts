/**
 * 防抖 Hook
 * 延迟执行函数，在指定时间内多次调用只执行最后一次
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 防抖值 Hook
 * 
 * @param value - 要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 * 
 * @example
 * ```tsx
 * const [searchText, setSearchText] = useState('')
 * const debouncedSearchText = useDebounce(searchText, 500)
 * 
 * useEffect(() => {
 *   // 只在用户停止输入 500ms 后执行搜索
 *   if (debouncedSearchText) {
 *     searchAPI(debouncedSearchText)
 *   }
 * }, [debouncedSearchText])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清理函数：清除定时器
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 防抖函数 Hook
 * 
 * @param callback - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @param options - 配置选项
 * @returns 防抖后的函数
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebounceCallback(
 *   (searchText: string) => {
 *     searchAPI(searchText)
 *   },
 *   500
 * )
 * 
 * <Input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  options: {
    leading?: boolean  // 是否在延迟开始前立即调用
    trailing?: boolean // 是否在延迟结束后调用
    maxWait?: number   // 最大等待时间
  } = {}
): T {
  const { leading = false, trailing = true, maxWait } = options

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCallTimeRef = useRef<number>(0)
  const lastInvokeTimeRef = useRef<number>(0)
  const callbackRef = useRef<T>(callback)

  // 更新 callback ref
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  /**
   * 清除所有定时器
   */
  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current)
      maxWaitTimeoutRef.current = null
    }
  }

  /**
   * 执行回调
   */
  const invoke = useCallback(
    (...args: any[]) => {
      lastInvokeTimeRef.current = Date.now()
      return callbackRef.current(...args)
    },
    []
  )

  /**
   * 防抖函数
   */
  const debouncedCallback = useCallback(
    (...args: any[]) => {
      const now = Date.now()
      const isFirstCall = lastCallTimeRef.current === 0
      lastCallTimeRef.current = now

      // Leading edge
      if (leading && isFirstCall) {
        invoke(...args)
      }

      // 清除之前的定时器
      clearTimers()

      // Trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          invoke(...args)
          lastCallTimeRef.current = 0
        }, delay)
      }

      // Max wait
      if (maxWait && !maxWaitTimeoutRef.current) {
        const timeSinceLastInvoke = now - lastInvokeTimeRef.current
        if (timeSinceLastInvoke >= maxWait) {
          invoke(...args)
        } else {
          maxWaitTimeoutRef.current = setTimeout(() => {
            invoke(...args)
            maxWaitTimeoutRef.current = null
          }, maxWait - timeSinceLastInvoke)
        }
      }
    },
    [delay, leading, trailing, maxWait, invoke]
  ) as T

  // 清理
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  return debouncedCallback
}

/**
 * 防抖状态 Hook
 * 返回防抖值和立即更新函数
 * 
 * @param initialValue - 初始值
 * @param delay - 延迟时间（毫秒）
 * @returns [debouncedValue, setValue, immediateSetValue]
 * 
 * @example
 * ```tsx
 * const [searchText, setSearchText, setSearchTextImmediate] = useDebouncedState('', 500)
 * 
 * // 防抖更新
 * <Input onChange={(e) => setSearchText(e.target.value)} />
 * 
 * // 立即更新
 * <Button onClick={() => setSearchTextImmediate('')}>清空</Button>
 * ```
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue)
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  /**
   * 立即设置值（不防抖）
   */
  const setImmediateValue = useCallback((newValue: T) => {
    setValue(newValue)
    setDebouncedValue(newValue)
  }, [])

  return [debouncedValue, setValue, setImmediateValue]
}

export default useDebounce

