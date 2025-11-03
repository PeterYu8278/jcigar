/**
 * 统一卡片组件
 * 提供一致的卡片布局和样式
 */

import React from 'react'
import { Card as AntCard, CardProps as AntCardProps, Skeleton, Empty } from 'antd'
import { useTranslation } from 'react-i18next'
import { COMMON_LABELS } from '../../i18n/constants'

export interface CardProps extends AntCardProps {
  // 加载状态
  loading?: boolean
  loadingRows?: number
  
  // 空状态
  empty?: boolean
  emptyText?: string
  emptyDescription?: string
  
  // 渐变背景
  gradient?: boolean
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal'
  
  // 悬停效果
  hoverable?: boolean
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none'
  
  // 边框
  bordered?: boolean
  borderColor?: string
  
  // 圆角
  rounded?: boolean | number
  
  // 阴影
  shadow?: 'none' | 'small' | 'medium' | 'large'
  
  // 响应式
  fullHeight?: boolean
  
  // 交互
  onClick?: () => void
  onDoubleClick?: () => void
}

const Card: React.FC<CardProps> = ({
  loading = false,
  loadingRows = 3,
  empty = false,
  emptyText,
  emptyDescription,
  gradient = false,
  gradientDirection = 'diagonal',
  hoverable = false,
  hoverEffect = 'lift',
  bordered = true,
  borderColor,
  rounded = true,
  shadow = 'small',
  fullHeight = false,
  onClick,
  onDoubleClick,
  children,
  style,
  className,
  ...props
}) => {
  const { t } = useTranslation()
  
  // 使用翻译的默认值
  const finalEmptyText = emptyText || t(COMMON_LABELS.NO_DATA)
  
  // 获取渐变背景
  const getGradientBackground = (): string => {
    if (!gradient) return ''

    const gradients: Record<string, string> = {
      horizontal: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.1) 100%)',
      vertical: 'linear-gradient(180deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.1) 100%)',
      diagonal: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.1) 100%)'
    }

    return gradients[gradientDirection]
  }

  // 获取阴影样式
  const getShadowStyle = (): string => {
    const shadows: Record<string, string> = {
      none: 'none',
      small: '0 2px 8px rgba(0, 0, 0, 0.1)',
      medium: '0 4px 16px rgba(0, 0, 0, 0.15)',
      large: '0 8px 24px rgba(0, 0, 0, 0.2)'
    }

    return shadows[shadow]
  }

  // 获取悬停效果样式
  const getHoverStyle = (): React.CSSProperties => {
    if (!hoverable || hoverEffect === 'none') return {}

    const hoverStyles: Record<string, React.CSSProperties> = {
      lift: {
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: 'pointer'
      },
      glow: {
        transition: 'box-shadow 0.3s ease',
        cursor: 'pointer'
      },
      scale: {
        transition: 'transform 0.3s ease',
        cursor: 'pointer'
      },
      none: {}
    }

    return hoverStyles[hoverEffect]
  }

  // 获取圆角样式
  const getBorderRadius = (): number => {
    if (rounded === false) return 0
    if (typeof rounded === 'number') return rounded
    return 8
  }

  // 卡片样式
  const cardStyle: React.CSSProperties = {
    ...style,
    background: gradient ? getGradientBackground() : style?.background || 'var(--cigar-black-secondary)',
    borderColor: borderColor || 'var(--cigar-border-primary)',
    borderRadius: getBorderRadius(),
    boxShadow: getShadowStyle(),
    height: fullHeight ? '100%' : style?.height,
    ...getHoverStyle()
  }

  // 处理点击事件
  const handleClick = () => {
    if (onClick) onClick()
  }

  const handleDoubleClick = () => {
    if (onDoubleClick) onDoubleClick()
  }

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: loadingRows }} />
    }

    if (empty) {
      return (
        <Empty
          description={finalEmptyText}
          style={{ padding: '40px 0' }}
        >
          {emptyDescription && (
            <span style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>
              {emptyDescription}
            </span>
          )}
        </Empty>
      )
    }

    return children
  }

  return (
    <AntCard
      {...props}
      hoverable={hoverable}
      bordered={bordered}
      style={cardStyle}
      className={className}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {renderContent()}
    </AntCard>
  )
}

// 卡片网格组件
export const CardGrid: React.FC<{
  children: React.ReactNode
  hoverable?: boolean
  style?: React.CSSProperties
  className?: string
}> = ({ children, hoverable = true, style, className }) => {
  return (
    <AntCard.Grid
      hoverable={hoverable}
      style={{
        ...style,
        background: 'transparent',
        borderColor: 'var(--cigar-border-primary)'
      }}
      className={className}
    >
      {children}
    </AntCard.Grid>
  )
}

// 卡片元数据组件
export const CardMeta: React.FC<{
  title?: React.ReactNode
  description?: React.ReactNode
  avatar?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}> = ({ title, description, avatar, style, className }) => {
  return (
    <AntCard.Meta
      title={<span style={{ color: 'var(--cigar-text-primary)' }}>{title}</span>}
      description={<span style={{ color: 'var(--cigar-text-secondary)' }}>{description}</span>}
      avatar={avatar}
      style={style}
      className={className}
    />
  )
}

// 预设卡片样式
export const CardPresets = {
  /**
   * 统计卡片
   */
  Stat: ({
    title,
    value,
    description,
    icon,
    trend,
    ...props
  }: CardProps & {
    value: string | number
    description?: React.ReactNode
    icon?: React.ReactNode
    trend?: { value: number; isPositive: boolean }
  }) => (
    <Card {...props} hoverable>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>{title}</div>
          <div style={{ color: 'var(--cigar-text-primary)', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
            {value}
          </div>
          {description && (
            <div style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12, marginTop: 4 }}>
              {description}
            </div>
          )}
          {trend && (
            <div style={{
              color: trend.isPositive ? '#52c41a' : '#ff4d4f',
              fontSize: 12,
              marginTop: 4
            }}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {icon && (
          <div style={{ fontSize: 40, color: 'var(--cigar-gold-primary)', opacity: 0.8 }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  ),

  /**
   * 信息卡片
   */
  Info: ({ title, description, icon, ...props }: CardProps & { 
    description?: React.ReactNode
    icon?: React.ReactNode 
  }) => (
    <Card {...props}>
      <CardMeta
        avatar={icon}
        title={title}
        description={description}
      />
    </Card>
  ),

  /**
   * 操作卡片
   */
  Action: ({ title, description, actions, ...props }: CardProps & { 
    description?: React.ReactNode
    actions: React.ReactNode[] 
  }) => (
    <Card {...props} actions={actions}>
      <CardMeta
        title={title}
        description={description}
      />
    </Card>
  ),

  /**
   * 图片卡片
   */
  Image: ({ cover, title, description, ...props }: CardProps & {
    description?: React.ReactNode
  }) => (
    <Card {...props} cover={cover}>
      <CardMeta
        title={title}
        description={description}
      />
    </Card>
  )
}

export default Card
