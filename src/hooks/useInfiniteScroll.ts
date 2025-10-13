/**
 * 无限滚动 Hook
 * 检测滚动位置并触发加载更多
 */

import { useEffect, useRef, useCallback } from 'react'

export interface UseInfiniteScrollOptions {
  /** 加载更多的回调函数 */
  onLoadMore: () => void | Promise<void>
  /** 是否有更多数据 */
  hasMore: boolean
  /** 是否正在加载 */
  loading: boolean
  /** 触发距离（距离底部多少像素时触发） */
  threshold?: number
  /** 根元素（默认为 window） */
  root?: HTMLElement | null
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 无限滚动 Hook
 * 
 * @param options - 配置选项
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   hasMore,
 *   loadMore
 * } = useInfiniteFetch((page) => fetchList(page))
 * 
 * const scrollRef = useInfiniteScroll({
 *   onLoadMore: loadMore,
 *   hasMore,
 *   loading
 * })
 * 
 * <div ref={scrollRef} style={{ height: '500px', overflow: 'auto' }}>
 *   {data.map(item => <Item key={item.id} data={item} />)}
 *   {loading && <Spin />}
 * </div>
 * ```
 */
export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): React.RefObject<HTMLElement> {
  const {
    onLoadMore,
    hasMore,
    loading,
    threshold = 100,
    root = null,
    enabled = true
  } = options

  const scrollRef = useRef<HTMLElement>(null)
  const loadingRef = useRef(false)

  /**
   * 检查是否应该加载更多
   */
  const checkAndLoadMore = useCallback(() => {
    if (!enabled || !hasMore || loading || loadingRef.current) {
      return
    }

    const element = scrollRef.current || root || window

    let scrollTop: number
    let scrollHeight: number
    let clientHeight: number

    if (element === window) {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop
      scrollHeight = document.documentElement.scrollHeight
      clientHeight = window.innerHeight
    } else {
      const el = element as HTMLElement
      scrollTop = el.scrollTop
      scrollHeight = el.scrollHeight
      clientHeight = el.clientHeight
    }

    const distanceToBottom = scrollHeight - scrollTop - clientHeight

    if (distanceToBottom <= threshold) {
      loadingRef.current = true
      Promise.resolve(onLoadMore()).finally(() => {
        loadingRef.current = false
      })
    }
  }, [enabled, hasMore, loading, threshold, root, onLoadMore])

  /**
   * 监听滚动事件
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    const element = scrollRef.current || root || window
    element.addEventListener('scroll', checkAndLoadMore, { passive: true })

    // 初始检查（如果内容不足一屏，自动触发加载）
    checkAndLoadMore()

    return () => {
      element.removeEventListener('scroll', checkAndLoadMore as any)
    }
  }, [enabled, checkAndLoadMore, root])

  return scrollRef
}

export default useInfiniteScroll

