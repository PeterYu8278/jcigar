/**
 * 统一按钮组件
 * 提供一致的按钮样式和行为
 */

import React from 'react'
import { Button as AntButton, ButtonProps as AntButtonProps, Tooltip } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

export interface ButtonProps extends Omit<AntButtonProps, 'type'> {
  // 按钮变体
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'link' | 'text'
  
  // 加载状态
  loading?: boolean
  loadingText?: string
  
  // 提示信息
  tooltip?: string
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  
  // 确认操作
  confirm?: {
    title: string
    onConfirm: () => void
    onCancel?: () => void
  }
  
  // 样式定制
  fullWidth?: boolean
  gradient?: boolean
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  loadingText,
  tooltip,
  tooltipPlacement = 'top',
  confirm,
  fullWidth = false,
  gradient = false,
  children,
  style,
  className,
  onClick,
  ...props
}) => {
  const [isConfirming, setIsConfirming] = React.useState(false)

  // 映射变体到 Ant Design 类型
  const getButtonType = (): AntButtonProps['type'] => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'warning':
      case 'danger':
        return 'primary'
      case 'secondary':
        return 'default'
      case 'ghost':
        return 'ghost'
      case 'link':
        return 'link'
      case 'text':
        return 'text'
      default:
        return 'default'
    }
  }

  // 获取按钮样式
  const getButtonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      ...style,
      width: fullWidth ? '100%' : style?.width
    }

    // 渐变效果
    if (gradient && variant === 'primary') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        border: 'none'
      }
    }

    // 变体颜色
    const variantColors: Record<string, React.CSSProperties> = {
      success: {
        background: '#52c41a',
        borderColor: '#52c41a'
      },
      warning: {
        background: '#faad14',
        borderColor: '#faad14'
      },
      danger: {
        background: '#ff4d4f',
        borderColor: '#ff4d4f'
      }
    }

    if (variant in variantColors && getButtonType() === 'primary') {
      return {
        ...baseStyle,
        ...variantColors[variant]
      }
    }

    return baseStyle
  }

  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (confirm && !isConfirming) {
      setIsConfirming(true)
      // 这里可以集成 Modal.confirm 或自定义确认对话框
      if (window.confirm(confirm.title)) {
        confirm.onConfirm()
      } else {
        confirm.onCancel?.()
      }
      setIsConfirming(false)
    } else {
      onClick?.(e)
    }
  }

  // 渲染按钮内容
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingOutlined style={{ marginRight: 8 }} />
          {loadingText || children}
        </>
      )
    }
    return children
  }

  // 渲染按钮
  const button = (
    <AntButton
      {...props}
      type={getButtonType()}
      loading={loading}
      danger={variant === 'danger'}
      style={getButtonStyle()}
      className={className}
      onClick={handleClick}
    >
      {renderContent()}
    </AntButton>
  )

  // 包装 Tooltip
  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement={tooltipPlacement}>
        {button}
      </Tooltip>
    )
  }

  return button
}

// 预设按钮组合
export const ButtonPresets = {
  /**
   * 保存按钮
   */
  Save: (props: Partial<ButtonProps>) => (
    <Button variant="primary" {...props}>
      {props.children || '保存'}
    </Button>
  ),

  /**
   * 取消按钮
   */
  Cancel: (props: Partial<ButtonProps>) => (
    <Button variant="secondary" {...props}>
      {props.children || '取消'}
    </Button>
  ),

  /**
   * 创建按钮
   */
  Create: (props: Partial<ButtonProps>) => (
    <Button variant="primary" {...props}>
      {props.children || '创建'}
    </Button>
  ),

  /**
   * 编辑按钮
   */
  Edit: (props: Partial<ButtonProps>) => (
    <Button variant="primary" {...props}>
      {props.children || '编辑'}
    </Button>
  ),

  /**
   * 删除按钮
   */
  Delete: (props: Partial<ButtonProps>) => (
    <Button
      variant="danger"
      confirm={{
        title: '确定要删除吗？',
        onConfirm: props.onClick as any
      }}
      {...props}
    >
      {props.children || '删除'}
    </Button>
  ),

  /**
   * 确认按钮
   */
  Confirm: (props: Partial<ButtonProps>) => (
    <Button variant="success" {...props}>
      {props.children || '确认'}
    </Button>
  ),

  /**
   * 重置按钮
   */
  Reset: (props: Partial<ButtonProps>) => (
    <Button variant="secondary" {...props}>
      {props.children || '重置'}
    </Button>
  ),

  /**
   * 提交按钮
   */
  Submit: (props: Partial<ButtonProps>) => (
    <Button variant="primary" htmlType="submit" {...props}>
      {props.children || '提交'}
    </Button>
  ),

  /**
   * 关闭按钮
   */
  Close: (props: Partial<ButtonProps>) => (
    <Button variant="text" {...props}>
      {props.children || '关闭'}
    </Button>
  ),

  /**
   * 下载按钮
   */
  Download: (props: Partial<ButtonProps>) => (
    <Button variant="primary" {...props}>
      {props.children || '下载'}
    </Button>
  ),

  /**
   * 上传按钮
   */
  Upload: (props: Partial<ButtonProps>) => (
    <Button variant="primary" {...props}>
      {props.children || '上传'}
    </Button>
  ),

  /**
   * 刷新按钮
   */
  Refresh: (props: Partial<ButtonProps>) => (
    <Button variant="secondary" {...props}>
      {props.children || '刷新'}
    </Button>
  ),

  /**
   * 返回按钮
   */
  Back: (props: Partial<ButtonProps>) => (
    <Button variant="secondary" {...props}>
      {props.children || '返回'}
    </Button>
  )
}

export default Button
