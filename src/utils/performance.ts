/**
 * 性能监控工具
 * 提供应用性能监控和分析功能
 */

import React from 'react'

// 性能指标类型
export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: 'navigation' | 'resource' | 'mark' | 'measure' | 'custom'
}

// 性能报告
export interface PerformanceReport {
  metrics: PerformanceMetric[]
  summary: {
    totalLoadTime: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    firstInputDelay: number
    cumulativeLayoutShift: number
    timeToInteractive: number
  }
  resources: {
    scripts: number
    stylesheets: number
    images: number
    total: number
  }
}

// 性能监控配置
export interface PerformanceConfig {
  enabled: boolean
  sampleRate: number // 采样率 (0-1)
  reportInterval: number // 报告间隔（毫秒）
  thresholds: {
    loadTime: number // 页面加载时间阈值
    fcp: number // First Contentful Paint 阈值
    lcp: number // Largest Contentful Paint 阈值
    fid: number // First Input Delay 阈值
    cls: number // Cumulative Layout Shift 阈值
  }
}

// 默认配置
const defaultConfig: PerformanceConfig = {
  enabled: true,
  sampleRate: 1.0,
  reportInterval: 30000, // 30秒
  thresholds: {
    loadTime: 3000,
    fcp: 1800,
    lcp: 2500,
    fid: 100,
    cls: 0.1
  }
}

let config = { ...defaultConfig }
let metrics: PerformanceMetric[] = []

/**
 * 初始化性能监控
 */
export const initPerformanceMonitoring = (userConfig?: Partial<PerformanceConfig>): void => {
  if (userConfig) {
    config = { ...config, ...userConfig }
  }

  if (!config.enabled) return

  // 采样检查
  if (Math.random() > config.sampleRate) return

  // 监听页面加载完成
  if (document.readyState === 'complete') {
    collectNavigationMetrics()
  } else {
    window.addEventListener('load', collectNavigationMetrics)
  }

  // 监听资源加载
  observeResources()

  // 监听 Web Vitals
  observeWebVitals()

  // 定期上报数据
  setInterval(() => {
    reportMetrics()
  }, config.reportInterval)
}

/**
 * 收集导航指标
 */
const collectNavigationMetrics = (): void => {
  if (!window.performance || !window.performance.timing) return

  const timing = window.performance.timing
  const navigationStart = timing.navigationStart

  // 页面加载时间
  const loadTime = timing.loadEventEnd - navigationStart
  addMetric('Page Load Time', loadTime, 'ms', 'navigation')

  // DNS 查询时间
  const dnsTime = timing.domainLookupEnd - timing.domainLookupStart
  addMetric('DNS Lookup Time', dnsTime, 'ms', 'navigation')

  // TCP 连接时间
  const tcpTime = timing.connectEnd - timing.connectStart
  addMetric('TCP Connection Time', tcpTime, 'ms', 'navigation')

  // 请求时间
  const requestTime = timing.responseEnd - timing.requestStart
  addMetric('Request Time', requestTime, 'ms', 'navigation')

  // DOM 解析时间
  const domParseTime = timing.domComplete - timing.domLoading
  addMetric('DOM Parse Time', domParseTime, 'ms', 'navigation')

  // DOM Ready 时间
  const domReadyTime = timing.domContentLoadedEventEnd - navigationStart
  addMetric('DOM Ready Time', domReadyTime, 'ms', 'navigation')

  // 白屏时间
  const firstPaintTime = timing.responseStart - navigationStart
  addMetric('First Paint Time', firstPaintTime, 'ms', 'navigation')
}

/**
 * 观察资源加载
 */
const observeResources = (): void => {
  if (!window.performance || !window.performance.getEntriesByType) return

  const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  let scripts = 0
  let stylesheets = 0
  let images = 0

  resources.forEach(resource => {
    const duration = resource.duration

    if (resource.initiatorType === 'script') {
      scripts++
      addMetric(`Script: ${resource.name}`, duration, 'ms', 'resource')
    } else if (resource.initiatorType === 'link' || resource.initiatorType === 'css') {
      stylesheets++
      addMetric(`Stylesheet: ${resource.name}`, duration, 'ms', 'resource')
    } else if (resource.initiatorType === 'img') {
      images++
      addMetric(`Image: ${resource.name}`, duration, 'ms', 'resource')
    }
  })

  addMetric('Scripts Count', scripts, 'count', 'resource')
  addMetric('Stylesheets Count', stylesheets, 'count', 'resource')
  addMetric('Images Count', images, 'count', 'resource')
  addMetric('Total Resources', resources.length, 'count', 'resource')
}

/**
 * 观察 Web Vitals
 */
const observeWebVitals = (): void => {
  // First Contentful Paint (FCP)
  if ('PerformanceObserver' in window) {
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            addMetric('First Contentful Paint', entry.startTime, 'ms', 'mark')
            fcpObserver.disconnect()
          }
        }
      })
      fcpObserver.observe({ entryTypes: ['paint'] })
    } catch (e) {
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        addMetric('Largest Contentful Paint', lastEntry.startTime, 'ms', 'mark')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime
          addMetric('First Input Delay', fid, 'ms', 'mark')
          fidObserver.disconnect()
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
            addMetric('Cumulative Layout Shift', clsValue, 'score', 'mark')
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
    }
  }
}

/**
 * 添加性能指标
 */
export const addMetric = (
  name: string,
  value: number,
  unit: string = 'ms',
  category: PerformanceMetric['category'] = 'custom'
): void => {
  metrics.push({
    name,
    value: Math.round(value * 100) / 100,
    unit,
    timestamp: Date.now(),
    category
  })
}

/**
 * 标记性能点
 */
export const markPerformance = (name: string): void => {
  if (!window.performance || !window.performance.mark) return
  window.performance.mark(name)
}

/**
 * 测量性能
 */
export const measurePerformance = (name: string, startMark: string, endMark: string): number | null => {
  if (!window.performance || !window.performance.measure) return null

  try {
    window.performance.measure(name, startMark, endMark)
    const measure = window.performance.getEntriesByName(name, 'measure')[0]
    
    if (measure) {
      addMetric(name, measure.duration, 'ms', 'measure')
      return measure.duration
    }
  } catch (e) {
  }

  return null
}

/**
 * 获取所有指标
 */
export const getMetrics = (): PerformanceMetric[] => {
  return [...metrics]
}

/**
 * 清空指标
 */
export const clearMetrics = (): void => {
  metrics = []
}

/**
 * 生成性能报告
 */
export const generateReport = (): PerformanceReport => {
  const navigationMetrics = metrics.filter(m => m.category === 'navigation')
  const resourceMetrics = metrics.filter(m => m.category === 'resource')

  const getMetricValue = (name: string): number => {
    const metric = metrics.find(m => m.name === name)
    return metric ? metric.value : 0
  }

  return {
    metrics: getMetrics(),
    summary: {
      totalLoadTime: getMetricValue('Page Load Time'),
      firstContentfulPaint: getMetricValue('First Contentful Paint'),
      largestContentfulPaint: getMetricValue('Largest Contentful Paint'),
      firstInputDelay: getMetricValue('First Input Delay'),
      cumulativeLayoutShift: getMetricValue('Cumulative Layout Shift'),
      timeToInteractive: getMetricValue('DOM Ready Time')
    },
    resources: {
      scripts: getMetricValue('Scripts Count'),
      stylesheets: getMetricValue('Stylesheets Count'),
      images: getMetricValue('Images Count'),
      total: getMetricValue('Total Resources')
    }
  }
}

/**
 * 上报性能指标
 */
const reportMetrics = (): void => {
  if (metrics.length === 0) return

  const report = generateReport()

  // 检查阈值
  const warnings: string[] = []

  if (report.summary.totalLoadTime > config.thresholds.loadTime) {
    warnings.push(`Page load time (${report.summary.totalLoadTime}ms) exceeds threshold`)
  }

  if (report.summary.firstContentfulPaint > config.thresholds.fcp) {
    warnings.push(`FCP (${report.summary.firstContentfulPaint}ms) exceeds threshold`)
  }

  if (report.summary.largestContentfulPaint > config.thresholds.lcp) {
    warnings.push(`LCP (${report.summary.largestContentfulPaint}ms) exceeds threshold`)
  }

  if (report.summary.firstInputDelay > config.thresholds.fid) {
    warnings.push(`FID (${report.summary.firstInputDelay}ms) exceeds threshold`)
  }

  if (report.summary.cumulativeLayoutShift > config.thresholds.cls) {
    warnings.push(`CLS (${report.summary.cumulativeLayoutShift}) exceeds threshold`)
  }

  if (warnings.length > 0) {
  }

  // 发送到分析服务

  // 示例：发送到后端
  // fetch('/api/analytics/performance', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(report)
  // })

  // 清空已上报的指标
  clearMetrics()
}

/**
 * 性能监控 Hook
 */
export const usePerformance = (componentName: string) => {
  const startTimeRef = React.useRef<number>(Date.now())

  React.useEffect(() => {
    const mountTime = Date.now() - startTimeRef.current
    addMetric(`${componentName} Mount Time`, mountTime, 'ms', 'custom')

    return () => {
      const unmountTime = Date.now()
      const lifetime = unmountTime - startTimeRef.current
      addMetric(`${componentName} Lifetime`, lifetime, 'ms', 'custom')
    }
  }, [componentName])

  const measure = React.useCallback((operationName: string, fn: () => void) => {
    const startTime = Date.now()
    fn()
    const duration = Date.now() - startTime
    addMetric(`${componentName} - ${operationName}`, duration, 'ms', 'custom')
  }, [componentName])

  return { measure }
}

/**
 * 性能测试装饰器
 */
export const withPerformance = (
  Component: React.ComponentType<any>,
  componentName?: string
): React.FC<any> => {
  const WrappedComponent: React.FC<any> = (props) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown'
    usePerformance(name)
    return React.createElement(Component, props)
  }

  WrappedComponent.displayName = `withPerformance(${componentName || Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * 获取内存使用情况
 */
export const getMemoryUsage = (): { used: number; total: number; percentage: number } | null => {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }
  return null
}

/**
 * 监控长任务
 */
export const observeLongTasks = (): void => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          addMetric('Long Task', entry.duration, 'ms', 'custom')
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
    }
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  // 在开发环境中启用性能监控
  if (import.meta.env.DEV) {
    initPerformanceMonitoring({
      enabled: true,
      sampleRate: 1.0
    })
  }
}
