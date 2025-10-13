/**
 * 页面容器组件
 * 提供统一的页面布局（包含 header、content、footer）
 */

import React, { useState, useEffect } from 'react'
import { Spin, Result, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import PageHeader, { type PageHeaderProps } from './PageHeader'
import { useResponsive } from '../../hooks/useResponsive'
import ErrorBoundary from '../common/ErrorBoundary'

export interface PageContainerProps {
  /** 子组件 */
  children: React.ReactNode
  /** 页面头部配置 */
  header?: PageHeaderProps | false
  /** 是否显示头部 */
  showHeader?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 加载提示文字 */
  loadingTip?: string
  /** 错误状态 */
  error?: Error | string | null
  /** 错误重试回调 */
  onErrorRetry?: () => void
  /** 是否为空数据 */
  isEmpty?: boolean
  /** 空数据组件 */
  emptyComponent?: React.ReactNode
  /** 页脚内容 */
  footer?: React.ReactNode
  /** 自定义样式类名 */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 内容区域样式 */
  contentStyle?: React.CSSProperties
  /** 是否固定头部 */
  fixedHeader?: boolean
  /** 是否使用卡片容器 */
  ghost?: boolean
}

/**
 * 页面容器组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <PageContainer
 *   header={{
 *     title: '用户管理',
 *     subTitle: '管理系统用户'
 *   }}
 * >
 *   <YourContent />
 * </PageContainer>
 * 
 * // 带加载状态
 * <PageContainer
 *   header={{ title: '订单列表' }}
 *   loading={loading}
 *   loadingTip="加载中..."
 * >
 *   <OrderList />
 * </PageContainer>
 * 
 * // 带错误处理
 * <PageContainer
 *   header={{ title: '数据统计' }}
 *   error={error}
 *   onErrorRetry={handleRetry}
 * >
 *   <Statistics />
 * </PageContainer>
 * 
 * // 空数据状态
 * <PageContainer
 *   header={{ title: '我的订单' }}
 *   isEmpty={orders.length === 0}
 *   emptyComponent={<Empty description="暂无订单" />}
 * >
 *   <OrderList data={orders} />
 * </PageContainer>
 * ```
 */
const PageContainer: React.FC<PageContainerProps> = ({
  children,
  header,
  showHeader = true,
  loading = false,
  loadingTip = '加载中...',
  error = null,
  onErrorRetry,
  isEmpty = false,
  emptyComponent,
  footer,
  className,
  style,
  contentStyle,
  fixedHeader = false,
  ghost = false
}) => {
  const { isMobile } = useResponsive()
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

  /**
   * 计算内容区域高度
   */
  useEffect(() => {
    if (fixedHeader) {
      const calculateHeight = () => {
        const headerHeight = 64 // 假设头部高度
        const footerHeight = footer ? 64 : 0
        const windowHeight = window.innerHeight
        setContentHeight(windowHeight - headerHeight - footerHeight)
      }

      calculateHeight()
      window.addEventListener('resize', calculateHeight)
      return () => window.removeEventListener('resize', calculateHeight)
    }
  }, [fixedHeader, footer])

  /**
   * 渲染页面头部
   */
  const renderHeader = () => {
    if (!showHeader || header === false) {
      return null
    }

    if (header) {
      return <PageHeader {...header} />
    }

    return null
  }

  /**
   * 渲染加载状态
   */
  const renderLoading = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          padding: '40px 0'
        }}
      >
        <Spin size="large" tip={loadingTip} />
      </div>
    )
  }

  /**
   * 渲染错误状态
   */
  const renderError = () => {
    const errorMessage = typeof error === 'string' ? error : error?.message || '加载失败'

    return (
      <div style={{ padding: '40px 0' }}>
        <Result
          status="error"
          title="加载失败"
          subTitle={errorMessage}
          extra={
            onErrorRetry && (
              <Button type="primary" icon={<ReloadOutlined />} onClick={onErrorRetry}>
                重试
              </Button>
            )
          }
        />
      </div>
    )
  }

  /**
   * 渲染空数据状态
   */
  const renderEmpty = () => {
    if (emptyComponent) {
      return emptyComponent
    }

    return (
      <div style={{ padding: '40px 0' }}>
        <Result
          status="404"
          title="暂无数据"
          subTitle="当前没有任何数据"
        />
      </div>
    )
  }

  /**
   * 渲染内容
   */
  const renderContent = () => {
    // 优先级：loading > error > empty > children
    if (loading) {
      return renderLoading()
    }

    if (error) {
      return renderError()
    }

    if (isEmpty) {
      return renderEmpty()
    }

    return children
  }

  /**
   * 容器样式
   */
  const containerStyle: React.CSSProperties = {
    padding: isMobile ? '12px' : '24px',
    background: ghost ? 'transparent' : 'rgba(24, 22, 17, 0.95)',
    borderRadius: ghost ? 0 : '8px',
    minHeight: fixedHeader ? contentHeight : 'auto',
    ...style
  }

  /**
   * 内容样式
   */
  const finalContentStyle: React.CSSProperties = {
    minHeight: '200px',
    ...contentStyle
  }

  return (
    <ErrorBoundary>
      <div className={className} style={containerStyle}>
        {renderHeader()}
        <div style={finalContentStyle}>
          {renderContent()}
        </div>
        {footer && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(244, 175, 37, 0.2)' }}>
            {footer}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default PageContainer

