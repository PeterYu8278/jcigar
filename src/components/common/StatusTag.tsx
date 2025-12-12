import React from 'react'
import { Tag } from 'antd'
import type { TagProps } from 'antd'
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  USER_STATUS,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
  type OrderStatus,
  type PaymentStatus,
  type UserStatus
} from '@/constants/status'

interface StatusTagProps extends Omit<TagProps, 'color'> {
  /** 状态值 */
  status: OrderStatus | PaymentStatus | UserStatus | string
  /** 状态类型 */
  type: 'order' | 'payment' | 'user' | 'custom'
  /** 自定义颜色（当 type 为 'custom' 时使用） */
  customColor?: string
  /** 自定义文本（当 type 为 'custom' 时使用） */
  customText?: string
  /** 语言 */
  language?: 'zh' | 'en'
  /** 是否显示图标 */
  showIcon?: boolean
}

/**
 * 状态标签组件
 * 
 * @example
 * ```tsx
 * // 订单状态
 * <StatusTag status="pending" type="order" />
 * <StatusTag status="shipped" type="order" language="en" />
 * 
 * // 支付状态
 * <StatusTag status="paid" type="payment" />
 * 
 * // 用户状态
 * <StatusTag status="active" type="user" />
 * 
 * // 自定义状态
 * <StatusTag
 *   status="custom"
 *   type="custom"
 *   customColor="purple"
 *   customText="自定义状态"
 * />
 * ```
 */
const StatusTag: React.FC<StatusTagProps> = ({
  status,
  type,
  customColor,
  customText,
  language = 'zh',
  showIcon = false,
  ...restProps
}) => {
  /**
   * 获取状态文本
   */
  const getText = (): string => {
    if (type === 'custom' && customText) {
      return customText
    }

    switch (type) {
      case 'order':
        return ORDER_STATUS_LABELS[status as OrderStatus]?.[language] || status
      case 'payment':
        return PAYMENT_STATUS_LABELS[status as PaymentStatus]?.[language] || status
      case 'user':
        return USER_STATUS_LABELS[status as UserStatus]?.[language] || status
      default:
        return status
    }
  }

  /**
   * 获取状态颜色
   */
  const getColor = (): string => {
    if (type === 'custom' && customColor) {
      return customColor
    }

    switch (type) {
      case 'order':
        return ORDER_STATUS_COLORS[status as OrderStatus] || 'default'
      case 'payment':
        return PAYMENT_STATUS_COLORS[status as PaymentStatus] || 'default'
      case 'user':
        return USER_STATUS_COLORS[status as UserStatus] || 'default'
      default:
        return 'default'
    }
  }

  /**
   * 获取状态图标
   */
  const getIcon = (): string => {
    if (!showIcon) return ''

    // 订单状态图标
    if (type === 'order') {
      switch (status as OrderStatus) {
        case ORDER_STATUS.PENDING:
          return ''
        case ORDER_STATUS.PROCESSING:
          return ''
        case ORDER_STATUS.SHIPPED:
          return ''
        case ORDER_STATUS.DELIVERED:
          return ''
        case ORDER_STATUS.CANCELLED:
          return ''
        default:
          return ''
      }
    }

    // 支付状态图标
    if (type === 'payment') {
      switch (status as PaymentStatus) {
        case PAYMENT_STATUS.UNPAID:
          return ''
        case PAYMENT_STATUS.PAID:
          return ''
        case PAYMENT_STATUS.REFUNDED:
          return ''
        case PAYMENT_STATUS.PARTIAL_REFUND:
          return ''
        default:
          return ''
      }
    }

    // 用户状态图标
    if (type === 'user') {
      switch (status as UserStatus) {
        case USER_STATUS.ACTIVE:
          return ''
        case USER_STATUS.INACTIVE:
          return ''
        case USER_STATUS.SUSPENDED:
          return ''
        default:
          return ''
      }
    }

    return ''
  }

  const text = getText()
  const color = getColor()
  const icon = getIcon()

  return (
    <Tag color={color} {...restProps}>
      {icon}{text}
    </Tag>
  )
}

/**
 * 订单状态标签（快捷方式）
 */
export const OrderStatusTag: React.FC<Omit<StatusTagProps, 'type'>> = (props) => {
  return <StatusTag {...props} type="order" />
}

/**
 * 支付状态标签（快捷方式）
 */
export const PaymentStatusTag: React.FC<Omit<StatusTagProps, 'type'>> = (props) => {
  return <StatusTag {...props} type="payment" />
}

/**
 * 用户状态标签（快捷方式）
 */
export const UserStatusTag: React.FC<Omit<StatusTagProps, 'type'>> = (props) => {
  return <StatusTag {...props} type="user" />
}

/**
 * 批量状态标签（用于显示多个状态）
 * 
 * @example
 * ```tsx
 * <StatusTagGroup
 *   items={[
 *     { status: 'pending', type: 'order' },
 *     { status: 'unpaid', type: 'payment' }
 *   ]}
 * />
 * ```
 */
interface StatusTagGroupProps {
  /** 状态项列表 */
  items: Array<{
    status: string
    type: 'order' | 'payment' | 'user' | 'custom'
    customColor?: string
    customText?: string
  }>
  /** 语言 */
  language?: 'zh' | 'en'
  /** 是否显示图标 */
  showIcon?: boolean
}

export const StatusTagGroup: React.FC<StatusTagGroupProps> = ({
  items,
  language = 'zh',
  showIcon = false
}) => {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {items.map((item, index) => (
        <StatusTag
          key={index}
          status={item.status}
          type={item.type}
          customColor={item.customColor}
          customText={item.customText}
          language={language}
          showIcon={showIcon}
        />
      ))}
    </div>
  )
}

export default StatusTag

