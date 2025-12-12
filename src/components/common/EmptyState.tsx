import React from 'react'
import { Empty, Button } from 'antd'
import type { EmptyProps } from 'antd'

interface EmptyStateProps extends Omit<EmptyProps, 'description'> {
  /** 标题 */
  title?: string
  /** 描述文字 */
  description?: React.ReactNode
  /** 自定义图标 */
  icon?: React.ReactNode
  /** 操作按钮文字 */
  actionText?: string
  /** 操作按钮点击事件 */
  onAction?: () => void
  /** 操作按钮类型 */
  actionType?: 'primary' | 'default' | 'dashed'
  /** 是否显示操作按钮 */
  showAction?: boolean
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 容器样式 */
  containerStyle?: React.CSSProperties
  /** 预设类型 */
  type?: 'default' | 'noData' | 'noResult' | 'noPermission' | 'error' | 'network'
}

/**
 * 空状态组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <EmptyState />
 * 
 * // 无数据
 * <EmptyState type="noData" actionText="添加数据" onAction={handleAdd} />
 * 
 * // 无搜索结果
 * <EmptyState type="noResult" description="请尝试其他关键词" />
 * 
 * // 自定义
 * <EmptyState
 *   icon={<CustomIcon />}
 *   title="自定义标题"
 *   description="自定义描述"
 *   actionText="自定义按钮"
 *   onAction={handleAction}
 * />
 * ```
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  actionType = 'primary',
  showAction = true,
  style,
  containerStyle,
  type = 'default',
  image,
  ...restProps
}) => {
  // 根据类型设置默认值
  const getDefaultConfig = () => {
    switch (type) {
      case 'noData':
        return {
          defaultTitle: '暂无数据',
          defaultDescription: '还没有任何数据，点击下方按钮添加',
          defaultIcon: '',
          defaultActionText: '添加数据'
        }
      case 'noResult':
        return {
          defaultTitle: '无搜索结果',
          defaultDescription: '没有找到匹配的内容，请尝试其他关键词',
          defaultIcon: '',
          defaultActionText: '重置搜索'
        }
      case 'noPermission':
        return {
          defaultTitle: '暂无权限',
          defaultDescription: '您没有权限访问此内容',
          defaultIcon: '',
          defaultActionText: '返回首页'
        }
      case 'error':
        return {
          defaultTitle: '出错了',
          defaultDescription: '页面加载失败，请稍后重试',
          defaultIcon: '',
          defaultActionText: '重新加载'
        }
      case 'network':
        return {
          defaultTitle: '网络错误',
          defaultDescription: '网络连接失败，请检查网络设置',
          defaultIcon: '📡',
          defaultActionText: '重试'
        }
      default:
        return {
          defaultTitle: '暂无内容',
          defaultDescription: '',
          defaultIcon: null,
          defaultActionText: '刷新'
        }
    }
  }

  const { defaultTitle, defaultDescription, defaultIcon, defaultActionText } = getDefaultConfig()

  const finalTitle = title ?? defaultTitle
  const finalDescription = description ?? defaultDescription
  const finalIcon = icon ?? defaultIcon
  const finalActionText = actionText ?? defaultActionText

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        minHeight: '300px',
        ...containerStyle
      }}
    >
      <Empty
        image={image ?? (finalIcon ? <div style={{ fontSize: '64px', marginBottom: '16px' }}>{finalIcon}</div> : Empty.PRESENTED_IMAGE_SIMPLE)}
        description={
          <div style={{ marginTop: '16px' }}>
            {finalTitle && (
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  marginBottom: '8px'
                }}
              >
                {finalTitle}
              </div>
            )}
            {finalDescription && (
              <div
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  lineHeight: '1.6'
                }}
              >
                {finalDescription}
              </div>
            )}
          </div>
        }
        style={style}
        {...restProps}
      >
        {showAction && onAction && (
          <Button
            type={actionType}
            onClick={onAction}
            style={{ marginTop: '16px' }}
          >
            {finalActionText}
          </Button>
        )}
      </Empty>
    </div>
  )
}

export default EmptyState

