/**
 * 骨架屏加载组件
 * 提供各种场景的骨架屏
 */

import React from 'react'
import { Skeleton, Card, Space } from 'antd'
import type { SkeletonProps } from 'antd'

export interface SkeletonLoaderProps extends SkeletonProps {
  /** 骨架屏类型 */
  type?: 'text' | 'list' | 'card' | 'table' | 'form' | 'statistic' | 'custom'
  /** 行数（list、table 类型使用） */
  rows?: number
  /** 是否显示头像 */
  avatar?: boolean
  /** 头像大小 */
  avatarSize?: 'small' | 'default' | 'large'
  /** 头像形状 */
  avatarShape?: 'circle' | 'square'
  /** 是否使用卡片容器 */
  card?: boolean
  /** 自定义渲染 */
  children?: React.ReactNode
}

/**
 * 骨架屏加载组件
 * 
 * @example
 * ```tsx
 * // 基础文本骨架屏
 * <SkeletonLoader type="text" rows={3} />
 * 
 * // 列表骨架屏
 * <SkeletonLoader type="list" rows={5} avatar />
 * 
 * // 卡片骨架屏
 * <SkeletonLoader type="card" />
 * 
 * // 表格骨架屏
 * <SkeletonLoader type="table" rows={10} />
 * 
 * // 表单骨架屏
 * <SkeletonLoader type="form" />
 * 
 * // 统计卡片骨架屏
 * <SkeletonLoader type="statistic" />
 * 
 * // 条件渲染
 * <SkeletonLoader active loading={loading}>
 *   <YourContent />
 * </SkeletonLoader>
 * ```
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  rows = 3,
  avatar = false,
  avatarSize = 'default',
  avatarShape = 'circle',
  card = false,
  loading = true,
  active = true,
  children,
  ...restProps
}) => {
  /**
   * 渲染文本骨架屏
   */
  const renderTextSkeleton = () => {
    return (
      <Skeleton
        active={active}
        loading={loading}
        paragraph={{ rows }}
        {...restProps}
      >
        {children}
      </Skeleton>
    )
  }

  /**
   * 渲染列表骨架屏
   */
  const renderListSkeleton = () => {
    const items = Array.from({ length: rows }, (_, index) => index)

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {items.map((item) => (
          <Skeleton
            key={item}
            active={active}
            loading={loading}
            avatar={avatar ? { size: avatarSize, shape: avatarShape } : false}
            paragraph={{ rows: 2 }}
            {...restProps}
          >
            {children}
          </Skeleton>
        ))}
      </Space>
    )
  }

  /**
   * 渲染卡片骨架屏
   */
  const renderCardSkeleton = () => {
    return (
      <Card>
        <Skeleton
          active={active}
          loading={loading}
          avatar={avatar ? { size: avatarSize, shape: avatarShape } : false}
          paragraph={{ rows }}
          {...restProps}
        >
          {children}
        </Skeleton>
      </Card>
    )
  }

  /**
   * 渲染表格骨架屏
   */
  const renderTableSkeleton = () => {
    return (
      <div>
        <Skeleton.Input
          active={active}
          style={{ width: 200, marginBottom: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton.Input
              key={index}
              active={active}
              style={{ width: '100%', height: 48 }}
              block
            />
          ))}
        </Space>
      </div>
    )
  }

  /**
   * 渲染表单骨架屏
   */
  const renderFormSkeleton = () => {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index}>
            <Skeleton.Input
              active={active}
              style={{ width: 120, marginBottom: 8 }}
              size="small"
            />
            <Skeleton.Input
              active={active}
              style={{ width: '100%' }}
              size="large"
              block
            />
          </div>
        ))}
      </Space>
    )
  }

  /**
   * 渲染统计卡片骨架屏
   */
  const renderStatisticSkeleton = () => {
    return (
      <Card>
        <Skeleton.Input
          active={active}
          style={{ width: 100, marginBottom: 12 }}
          size="small"
        />
        <Skeleton.Input
          active={active}
          style={{ width: 150 }}
          size="large"
        />
        <Skeleton.Input
          active={active}
          style={{ width: 80, marginTop: 12 }}
          size="small"
        />
      </Card>
    )
  }

  /**
   * 渲染骨架屏
   */
  const renderSkeleton = () => {
    if (!loading && children) {
      return children
    }

    switch (type) {
      case 'list':
        return renderListSkeleton()
      case 'card':
        return renderCardSkeleton()
      case 'table':
        return renderTableSkeleton()
      case 'form':
        return renderFormSkeleton()
      case 'statistic':
        return renderStatisticSkeleton()
      case 'text':
      default:
        return renderTextSkeleton()
    }
  }

  const skeleton = renderSkeleton()

  // 是否使用卡片容器
  if (card && loading) {
    return <Card>{skeleton}</Card>
  }

  return <>{skeleton}</>
}

/**
 * 页面骨架屏
 * 用于整个页面加载
 */
export const PageSkeleton: React.FC<{ loading?: boolean; children?: React.ReactNode }> = ({
  loading = true,
  children
}) => {
  if (!loading && children) {
    return <>{children}</>
  }

  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 300, marginBottom: 24 }} size="large" />
      <SkeletonLoader type="card" rows={4} />
      <div style={{ marginTop: 24 }}>
        <SkeletonLoader type="table" rows={8} />
      </div>
    </div>
  )
}

/**
 * 卡片列表骨架屏
 * 用于卡片列表加载
 */
export const CardListSkeleton: React.FC<{
  count?: number
  loading?: boolean
  children?: React.ReactNode
}> = ({ count = 3, loading = true, children }) => {
  if (!loading && children) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </div>
  )
}

/**
 * 统计卡片列表骨架屏
 */
export const StatisticCardsSkeleton: React.FC<{
  count?: number
  loading?: boolean
  children?: React.ReactNode
}> = ({ count = 4, loading = true, children }) => {
  if (!loading && children) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonLoader key={index} type="statistic" />
      ))}
    </div>
  )
}

export default SkeletonLoader

