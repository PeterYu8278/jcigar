/**
 * 路由路径常量
 */

// 认证路由
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password'
} as const

// 前台路由
export const FRONTEND_ROUTES = {
  HOME: '/',
  SHOP: '/shop',
  EVENTS: '/events',
  PROFILE: '/profile',
  MY_ORDERS: '/my-orders'
} as const

// 后台路由
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin',
  USERS: '/admin/users',
  INVENTORY: '/admin/inventory',
  ORDERS: '/admin/orders',
  TRANSACTIONS: '/admin/transactions',
  EVENTS: '/admin/events',
  SETTINGS: '/admin/settings',
  GEMINI_TESTER: '/admin/gemini-tester'
} as const

// 所有路由
export const ROUTES = {
  ...AUTH_ROUTES,
  ...FRONTEND_ROUTES,
  ...ADMIN_ROUTES
} as const

export type RouteKey = keyof typeof ROUTES
export type RoutePath = typeof ROUTES[RouteKey]

