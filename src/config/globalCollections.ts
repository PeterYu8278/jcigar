/**
 * 全局 Firebase Collection IDs
 * 集中管理所有 Firestore 集合名称
 */

export const GLOBAL_COLLECTIONS = {
  /** 用户集合 */
  USERS: 'users',
  /** 品牌集合 */
  BRANDS: 'brands',
  /** 雪茄产品集合 */
  CIGARS: 'cigars',
  /** 订单集合 */
  ORDERS: 'orders',
  /** 活动集合 */
  EVENTS: 'events',
  /** 会员集合 */
  MEMBERS: 'members',
  /** 入库订单集合 */
  INBOUND_ORDERS: 'inbound_orders',
  /** 出库订单集合 */
  OUTBOUND_ORDERS: 'outbound_orders',
  /** 库存变动索引集合 */
  INVENTORY_MOVEMENTS: 'inventory_movements',
  /** 通知集合 */
  NOTIFICATIONS: 'notifications',
  /** 系统配置集合 */
  SYSTEM_CONFIG: 'system_config'
} as const

export type CollectionName = typeof GLOBAL_COLLECTIONS[keyof typeof GLOBAL_COLLECTIONS]

