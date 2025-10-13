/**
 * 翻译键常量
 * 提供类型安全的翻译键引用，避免硬编码字符串
 */

// 通用操作
export const COMMON_ACTIONS = {
  SAVE: 'common.save',
  CANCEL: 'common.cancel',
  CONFIRM: 'common.confirm',
  DELETE: 'common.delete',
  EDIT: 'common.edit',
  ADD: 'common.add',
  CREATE: 'common.create',
  DONE: 'common.done',
  VIEW: 'common.view',
  SEARCH: 'common.search',
  RESET: 'common.reset',
  SUBMIT: 'common.submit',
  BACK: 'common.back',
  NEXT: 'common.next',
  PREVIOUS: 'common.previous',
  CLOSE: 'common.close',
  OK: 'common.ok',
  YES: 'common.yes',
  NO: 'common.no',
  REMOVE: 'common.remove',
  UPLOAD: 'common.upload',
  DOWNLOAD: 'common.download',
  REFRESH: 'common.refresh',
  RETRY: 'common.retry',
  MORE: 'common.more',
  EXPORT_REPORT: 'common.exportReport',
  CLEAR_DATA: 'common.clearData',
} as const

// 通用状态
export const COMMON_STATUS = {
  LOADING: 'common.loading',
  SUCCESS: 'common.success',
  ERROR: 'common.error',
  WARNING: 'common.warning',
  INFO: 'common.info',
  SAVED: 'common.saved',
  CREATED: 'common.created',
  DELETED: 'common.deleted',
  UPDATED: 'common.updated',
  FAILED: 'common.saveFailed',
  LOAD_FAILED: 'common.loadFailed',
} as const

// 通用标签
export const COMMON_LABELS = {
  NAME: 'common.name',
  PHONE: 'common.phone',
  EMAIL: 'common.email',
  STATUS: 'common.status',
  ACTION: 'common.action',
  DESCRIPTION: 'common.description',
  START_DATE: 'common.startDate',
  END_DATE: 'common.endDate',
  NO_DATA: 'common.noData',
} as const

// 事件状态
export const EVENT_STATUS = {
  DRAFT: 'common.draft',
  PUBLISHED: 'common.published',
  ONGOING: 'common.ongoing',
  COMPLETED: 'common.completed',
  CANCELLED: 'common.cancelled',
} as const

// 用户角色
export const USER_ROLES = {
  ADMIN: 'common.admin',
  MEMBER: 'common.member',
  GUEST: 'common.guest',
} as const

// 认证相关
export const AUTH_KEYS = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  REGISTER: 'auth.register',
  EMAIL: 'auth.email',
  PASSWORD: 'auth.password',
  CONFIRM_PASSWORD: 'auth.confirmPassword',
  LOGIN_SUCCESS: 'auth.loginSuccess',
  LOGOUT_SUCCESS: 'auth.logoutSuccess',
  LOGIN_FAILED: 'auth.loginFailed',
  REGISTER_SUCCESS: 'auth.registerSuccess',
  REGISTER_FAILED: 'auth.registerFailed',
} as const

// 导航
export const NAV_KEYS = {
  HOME: 'navigation.home',
  EVENTS: 'navigation.events',
  SHOP: 'navigation.shop',
  PROFILE: 'navigation.profile',
  ADMIN: 'navigation.admin',
  DASHBOARD: 'navigation.dashboard',
  USERS: 'navigation.users',
  INVENTORY: 'navigation.inventory',
  ORDERS: 'navigation.orders',
  FINANCE: 'navigation.finance',
  PERFORMANCE: 'navigation.performance',
} as const

// 订单状态
export const ORDER_STATUS = {
  PENDING: 'ordersAdmin.status.pending',
  CONFIRMED: 'ordersAdmin.status.confirmed',
  SHIPPED: 'ordersAdmin.status.shipped',
  DELIVERED: 'ordersAdmin.status.delivered',
  CANCELLED: 'ordersAdmin.status.cancelled',
} as const

// 库存相关
export const INVENTORY_KEYS = {
  STOCK_IN: 'inventory.stockIn',
  STOCK_OUT: 'inventory.stockOut',
  STOCK_NORMAL: 'inventory.stockNormal',
  STOCK_LOW: 'inventory.stockLow',
  STOCK_CRITICAL: 'inventory.stockCritical',
  ADD_PRODUCT: 'inventory.addProduct',
  BRAND_MANAGEMENT: 'inventory.brandManagement',
} as const

// 消息提示
export const MESSAGE_KEYS = {
  OPERATION_SUCCESS: 'messages.operationSuccess',
  OPERATION_FAILED: 'messages.operationFailed',
  CONFIRM_DELETE: 'messages.confirmDelete',
  NO_PERMISSION: 'messages.noPermission',
  DATA_LOAD_FAILED: 'messages.dataLoadFailed',
  NETWORK_ERROR: 'messages.networkError',
} as const

// 批量操作
export const BATCH_ACTIONS = {
  DELETE: 'common.batchDelete',
  DELETE_CONFIRM: 'common.batchDeleteConfirm',
  DELETED: 'common.batchDeleted',
  DELETE_FAILED: 'common.batchDeleteFailed',
} as const

// 验证消息
export const VALIDATION_KEYS = {
  REQUIRED: 'common.required',
  OPTIONAL: 'common.optional',
  PLEASE_INPUT_NAME: 'common.pleaseInputName',
  PLEASE_INPUT_EMAIL: 'common.pleaseInputEmail',
  PLEASE_INPUT_PHONE: 'common.pleaseInputPhone',
} as const

// 会员等级
export const MEMBER_LEVELS = {
  BRONZE: 'profile.bronzeMember',
  SILVER: 'profile.silverMember',
  GOLD: 'profile.goldMember',
  PLATINUM: 'profile.platinumMember',
  REGULAR: 'profile.regularMember',
} as const

// 性能监控相关
export const PERFORMANCE_KEYS = {
  TITLE: 'performance.title',
  OVERVIEW: 'performance.overview',
  DETAILED_METRICS: 'performance.detailedMetrics',
  AUTO_REFRESH_ON: 'performance.autoRefreshOn',
  AUTO_REFRESH_OFF: 'performance.autoRefreshOff',
  METRIC_NAME: 'performance.metricName',
  VALUE: 'performance.value',
  CATEGORY: 'performance.category',
  TIMESTAMP: 'performance.timestamp',
} as const

// 容器组件相关
export const CONTAINER_KEYS = {
  LOAD_FAILED: 'container.loadFailed',
  NO_DATA: 'container.noData',
  CONFIRM_DELETE: 'common.confirmDelete',
  NO_NOTIFICATIONS: 'common.noNotifications',
  CURRENT_NO_DATA: 'common.currentNoData',
} as const

// 导出所有常量的联合类型
export type TranslationKey =
  | typeof COMMON_ACTIONS[keyof typeof COMMON_ACTIONS]
  | typeof COMMON_STATUS[keyof typeof COMMON_STATUS]
  | typeof COMMON_LABELS[keyof typeof COMMON_LABELS]
  | typeof EVENT_STATUS[keyof typeof EVENT_STATUS]
  | typeof USER_ROLES[keyof typeof USER_ROLES]
  | typeof AUTH_KEYS[keyof typeof AUTH_KEYS]
  | typeof NAV_KEYS[keyof typeof NAV_KEYS]
  | typeof ORDER_STATUS[keyof typeof ORDER_STATUS]
  | typeof INVENTORY_KEYS[keyof typeof INVENTORY_KEYS]
  | typeof MESSAGE_KEYS[keyof typeof MESSAGE_KEYS]
  | typeof BATCH_ACTIONS[keyof typeof BATCH_ACTIONS]
  | typeof VALIDATION_KEYS[keyof typeof VALIDATION_KEYS]
  | typeof MEMBER_LEVELS[keyof typeof MEMBER_LEVELS]
  | typeof PERFORMANCE_KEYS[keyof typeof PERFORMANCE_KEYS]
  | typeof CONTAINER_KEYS[keyof typeof CONTAINER_KEYS]

