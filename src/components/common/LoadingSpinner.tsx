import React from 'react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import type { SpinProps } from 'antd'

interface LoadingSpinnerProps extends SpinProps {
  /** 加载提示文本 */
  tip?: string
  /** 是否全屏显示 */
  fullScreen?: boolean
  /** 是否延迟显示（避免闪烁） */
  delay?: number
  /** 自定义图标 */
  icon?: React.ReactNode
  /** 容器样式 */
  containerStyle?: React.CSSProperties
  /** 加载类型 */
  type?: 'default' | 'page' | 'section' | 'inline'
}

/**
 * 加载状态组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <LoadingSpinner />
 * 
 * // 带提示文本
 * <LoadingSpinner tip="加载中..." />
 * 
 * // 全屏加载
 * <LoadingSpinner fullScreen tip="数据加载中，请稍候..." />
 * 
 * // 页面加载（占据整个内容区域）
 * <LoadingSpinner type="page" tip="加载中..." />
 * 
 * // 区块加载（适合卡片内部）
 * <LoadingSpinner type="section" tip="数据加载中..." />
 * 
 * // 行内加载（适合按钮旁边）
 * <LoadingSpinner type="inline" size="small" />
 * ```
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip,
  fullScreen = false,
  delay = 200,
  icon,
  containerStyle,
  type = 'default',
  size = 'default',
  ...restProps
}) => {
  // 默认图标
  const defaultIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

  // 根据类型设置样式
  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...containerStyle
    }

    switch (type) {
      case 'page':
        return {
          ...baseStyle,
          minHeight: '60vh',
          width: '100%'
        }
      case 'section':
        return {
          ...baseStyle,
          minHeight: '200px',
          width: '100%',
          padding: '40px 20px'
        }
      case 'inline':
        return {
          ...baseStyle,
          display: 'inline-flex',
          margin: '0 8px'
        }
      default:
        return baseStyle
    }
  }

  // 全屏加载样式
  const fullScreenStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999
  }

  if (fullScreen) {
    return (
      <div style={fullScreenStyle}>
      <Spin
        indicator={icon ?? defaultIcon as any}
        tip={tip}
        delay={delay}
        size="large"
        {...restProps}
      />
        {tip && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '16px',
              color: '#FFFFFF',
              textAlign: 'center'
            }}
          >
            {tip}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={getContainerStyle()}>
      <Spin
        indicator={icon ?? defaultIcon as any}
        tip={tip}
        delay={delay}
        size={size}
        {...restProps}
      />
    </div>
  )
}

/**
 * 页面加载组件（快捷方式）
 */
export const PageLoading: React.FC<{ tip?: string }> = ({ tip = '页面加载中...' }) => {
  return <LoadingSpinner type="page" tip={tip} />
}

/**
 * 区块加载组件（快捷方式）
 */
export const SectionLoading: React.FC<{ tip?: string }> = ({ tip = '加载中...' }) => {
  return <LoadingSpinner type="section" tip={tip} />
}

/**
 * 行内加载组件（快捷方式）
 */
export const InlineLoading: React.FC<{ tip?: string }> = ({ tip }) => {
  return <LoadingSpinner type="inline" size="small" tip={tip} />
}

export default LoadingSpinner

