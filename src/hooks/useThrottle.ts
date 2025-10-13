/**
 * 节流 Hook
 * 限制函数执行频率，在指定时间内最多执行一次
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 节流值 Hook
 * 
 * @param value - 要节流的值
 * @param interval - 时间间隔（毫秒）
 * @returns 节流后的值
 * 
 * @example
 * ```tsx
 * const [scrollY, setScrollY] = useState(0)
 * const throttledScrollY = useThrottle(scrollY, 200)
 * 
 * useEffect(() => {
 *   const handleScroll = () => setScrollY(window.scrollY)
 *   window.addEventListener('scroll', handleScroll)
 *   return () => window.removeEventListener('scroll', handleScroll)
 * }, [])
 * 
 * // throttledScrollY 每 200ms 最多更新一次
 * ```
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastUpdateRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current

    if (timeSinceLastUpdate >= interval) {
      // 立即更新
      lastUpdateRef.current = now
      setThrottledValue(value)
    } else {
      // 延迟更新
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now()
        setThrottledValue(value)
      }, interval - timeSinceLastUpdate)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, interval])

  return throttledValue
}

/**
 * 节流函数 Hook
 * 
 * @param callback - 要节流的函数
 * @param interval - 时间间隔（毫秒）
 * @param options - 配置选项
 * @returns 节流后的函数
 * 
 * @example
 * ```tsx
 * const handleScroll = useThrottleCallback(
 *   () => {
 *     console.log('Scrolling...')
 *   },
 *   200
 * )
 * 
 * useEffect(() => {
 *   window.addEventListener('scroll', handleScroll)
 *   return () => window.removeEventListener('scroll', handleScroll)
 * }, [handleScroll])
 * ```
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 300,
  options: {
    leading?: boolean   // 是否在开始时立即执行
    trailing?: boolean  // 是否在结束时执行
  } = {}
): T {
  const { leading = true, trailing = true } = options

  const lastCallTimeRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastArgsRef = useRef<any[]>([])
  const callbackRef = useRef<T>(callback)

  // 更新 callback ref
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  /**
   * 清除定时器
   */
  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  /**
   * 执行回调
   */
  const invoke = useCallback(
    (...args: any[]) => {
      lastCallTimeRef.current = Date.now()
      return callbackRef.current(...args)
    },
    []
  )

  /**
   * 节流函数
   */
  const throttledCallback = useCallback(
    (...args: any[]) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallTimeRef.current

      lastArgsRef.current = args

      // Leading edge
      if (leading && timeSinceLastCall >= interval) {
        invoke(...args)
        clearTimer()
        return
      }

      // Trailing edge
      if (trailing && !timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          invoke(...lastArgsRef.current)
          clearTimer()
        }, interval - timeSinceLastCall)
      }
    },
    [interval, leading, trailing, invoke]
  ) as T

  // 清理
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [])

  return throttledCallback
}

/**
 * 节流状态 Hook
 * 返回节流值和立即更新函数
 * 
 * @param initialValue - 初始值
 * @param interval - 时间间隔（毫秒）
 * @returns [throttledValue, setValue, immediateSetValue]
 * 
 * @example
 * ```tsx
 * const [count, setCount, setCountImmediate] = useThrottledState(0, 1000)
 * 
 * // 节流更新（每秒最多更新一次）
 * <Button onClick={() => setCount(c => c + 1)}>增加</Button>
 * 
 * // 立即更新
 * <Button onClick={() => setCountImmediate(0)}>重置</Button>
 * ```
 */
export function useThrottledState<T>(
  initialValue: T,
  interval: number = 300
): [T, (value: T | ((prev: T) => T)) => void, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue)
  const [throttledValue, setThrottledValue] = useState<T>(initialValue)
  const lastUpdateRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current

    if (timeSinceLastUpdate >= interval) {
      lastUpdateRef.current = now
      setThrottledValue(value)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now()
        setThrottledValue(value)
      }, interval - timeSinceLastUpdate)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, interval])

  /**
   * 立即设置值（不节流）
   */
  const setImmediateValue = useCallback((newValue: T) => {
    setValue(newValue)
    setThrottledValue(newValue)
    lastUpdateRef.current = Date.now()
  }, [])

  return [throttledValue, setValue, setImmediateValue]
}

/**
 * FPS 节流 Hook
 * 按照指定的 FPS（帧率）来节流更新
 * 
 * @param callback - 要执行的函数
 * @param fps - 目标帧率（默认 60）
 * @returns 节流后的函数
 * 
 * @example
 * ```tsx
 * const handleMouseMove = useFpsThrottle(
 *   (e: MouseEvent) => {
 *     console.log(e.clientX, e.clientY)
 *   },
 *   30 // 30 FPS
 * )
 * ```
 */
export function useFpsThrottle<T extends (...args: any[]) => any>(
  callback: T,
  fps: number = 60
): T {
  const interval = 1000 / fps
  return useThrottleCallback(callback, interval, { leading: true, trailing: false })
}

export default useThrottle

