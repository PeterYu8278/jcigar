/**
 * 订单状态常量
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

/**
 * 订单状态标签映射
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, { zh: string; en: string }> = {
  [ORDER_STATUS.PENDING]: { zh: '待处理', en: 'Pending' },
  [ORDER_STATUS.PROCESSING]: { zh: '处理中', en: 'Processing' },
  [ORDER_STATUS.SHIPPED]: { zh: '已发货', en: 'Shipped' },
  [ORDER_STATUS.DELIVERED]: { zh: '已送达', en: 'Delivered' },
  [ORDER_STATUS.CANCELLED]: { zh: '已取消', en: 'Cancelled' }
}

/**
 * 订单状态颜色映射
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: '#faad14',      // 橙色
  [ORDER_STATUS.PROCESSING]: '#1890ff',   // 蓝色
  [ORDER_STATUS.SHIPPED]: '#52c41a',      // 绿色
  [ORDER_STATUS.DELIVERED]: '#52c41a',    // 绿色
  [ORDER_STATUS.CANCELLED]: '#ff4d4f'     // 红色
}

/**
 * 支付状态常量
 */
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund'
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

/**
 * 支付状态标签映射
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { zh: string; en: string }> = {
  [PAYMENT_STATUS.UNPAID]: { zh: '未支付', en: 'Unpaid' },
  [PAYMENT_STATUS.PAID]: { zh: '已支付', en: 'Paid' },
  [PAYMENT_STATUS.REFUNDED]: { zh: '已退款', en: 'Refunded' },
  [PAYMENT_STATUS.PARTIAL_REFUND]: { zh: '部分退款', en: 'Partial Refund' }
}

/**
 * 支付状态颜色映射
 */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: '#faad14',         // 橙色
  [PAYMENT_STATUS.PAID]: '#52c41a',           // 绿色
  [PAYMENT_STATUS.REFUNDED]: '#ff4d4f',       // 红色
  [PAYMENT_STATUS.PARTIAL_REFUND]: '#fa8c16'  // 橘色
}

/**
 * 用户状态常量
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

/**
 * 用户状态标签映射
 */
export const USER_STATUS_LABELS: Record<UserStatus, { zh: string; en: string }> = {
  [USER_STATUS.ACTIVE]: { zh: '活跃', en: 'Active' },
  [USER_STATUS.INACTIVE]: { zh: '未激活', en: 'Inactive' },
  [USER_STATUS.SUSPENDED]: { zh: '已暂停', en: 'Suspended' }
}

/**
 * 用户状态颜色映射
 */
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: '#52c41a',      // 绿色
  [USER_STATUS.INACTIVE]: '#d9d9d9',    // 灰色
  [USER_STATUS.SUSPENDED]: '#ff4d4f'    // 红色
}

