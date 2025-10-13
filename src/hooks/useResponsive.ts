import { useState, useEffect } from 'react'

/**
 * 响应式断点配置
 */
export const BREAKPOINTS = {
  xs: 0,      // 手机竖屏
  sm: 576,    // 手机横屏
  md: 768,    // 平板
  lg: 992,    // 桌面
  xl: 1200,   // 大桌面
  xxl: 1600   // 超大桌面
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * 响应式状态
 */
export interface ResponsiveState {
  isMobile: boolean      // <= 768px
  isTablet: boolean      // 768px - 992px
  isDesktop: boolean     // >= 992px
  isSmallScreen: boolean // <= 576px
  isLargeScreen: boolean // >= 1200px
  width: number          // 当前窗口宽度
  height: number         // 当前窗口高度
  breakpoint: Breakpoint // 当前断点
}

/**
 * 获取当前断点
 */
const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.xxl) return 'xxl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

/**
 * 获取响应式状态
 */
const getResponsiveState = (): ResponsiveState => {
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint = getBreakpoint(width)

  return {
    isMobile: width <= BREAKPOINTS.md,
    isTablet: width > BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isSmallScreen: width <= BREAKPOINTS.sm,
    isLargeScreen: width >= BREAKPOINTS.xl,
    width,
    height,
    breakpoint
  }
}

/**
 * 响应式 Hook
 * 
 * @example
 * ```tsx
 * const { isMobile, isDesktop, width } = useResponsive()
 * 
 * return (
 *   <div>
 *     {isMobile ? <MobileView /> : <DesktopView />}
 *   </div>
 * )
 * ```
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(getResponsiveState)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleResize = () => {
      // 防抖处理，避免频繁更新
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setState(getResponsiveState())
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    
    // 初始化时检查一次
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return state
}

/**
 * 媒体查询 Hook
 * 
 * @example
 * ```tsx
 * const matches = useMediaQuery('(min-width: 768px)')
 * ```
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches)

    // 现代浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } 
    // 旧版浏览器
    else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [query])

  return matches
}

/**
 * 断点判断 Hook
 * 
 * @example
 * ```tsx
 * const isAboveMd = useBreakpoint('md') // 是否大于等于 md
 * ```
 */
export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  const { width } = useResponsive()
  return width >= BREAKPOINTS[breakpoint]
}

