// 权限配置
import type { UserRole, Permission } from '../types';

// 角色权限配置
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  guest: {
    canViewEvents: true,
    canRegisterEvent: false,
    canPurchase: false,
    canViewProfile: false,
    canCreateEvent: false,
    canManageInventory: false,
    canManageUsers: false,
    canManageOrders: false,
    canViewFinance: false,
    canSwitchToAdmin: false,
  },
  member: {
    canViewEvents: true,
    canRegisterEvent: true,
    canPurchase: true,
    canViewProfile: true,
    canCreateEvent: false,
    canManageInventory: false,
    canManageUsers: false,
    canManageOrders: false,
    canViewFinance: false,
    canSwitchToAdmin: false,
  },
  vip: {
    canViewEvents: true,
    canRegisterEvent: true,
    canPurchase: true,
    canViewProfile: true,
    canCreateEvent: false,
    canManageInventory: false,
    canManageUsers: false,
    canManageOrders: false,
    canViewFinance: false,
    canSwitchToAdmin: false,
  },
  admin: {
    canViewEvents: true,
    canRegisterEvent: true,
    canPurchase: true,
    canViewProfile: true,
    canCreateEvent: true,
    canManageInventory: true,
    canManageUsers: true,
    canManageOrders: true,
    canViewFinance: true,
    canSwitchToAdmin: true,
    canManageFeatures: false,
  },
  developer: {
    canViewEvents: true,
    canRegisterEvent: true,
    canPurchase: true,
    canViewProfile: true,
    canCreateEvent: true,
    canManageInventory: true,
    canManageUsers: true,
    canManageOrders: true,
    canViewFinance: true,
    canSwitchToAdmin: true,
    canManageFeatures: true, // 开发者独有的权限
  }
};

// 路由权限配置
export const ROUTE_PERMISSIONS = {
  '/': ['guest', 'member', 'vip', 'admin', 'developer'],
  '/events': ['guest', 'member', 'vip', 'admin', 'developer'],
  '/shop': ['member', 'vip', 'admin', 'developer'],
  '/profile': ['member', 'vip', 'admin', 'developer'],
  '/reload': ['member', 'vip', 'admin', 'developer'], // 充值页面权限
  '/brand': ['member', 'vip', 'admin', 'developer'], // 品牌详情页面权限
  '/admin': ['admin', 'developer'],
  '/admin/users': ['admin', 'developer'],
  '/admin/inventory': ['admin', 'developer'],
  '/admin/events': ['admin', 'developer'],
  '/admin/orders': ['admin', 'developer'],
  '/admin/finance': ['admin', 'developer'],
  '/admin/feature-management': ['developer'], // 仅开发者可访问
};

// 权限检查函数
export const hasPermission = (userRole: UserRole, permission: keyof Permission): boolean => {
  return ROLE_PERMISSIONS[userRole][permission] ?? false;
};

// 路由权限检查函数
export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
  // 直接匹配
  const allowedRoles = ROUTE_PERMISSIONS[path as keyof typeof ROUTE_PERMISSIONS];
  if (allowedRoles) {
    return allowedRoles.includes(userRole);
  }
  
  // 动态路由匹配
  if (path.startsWith('/brand/')) {
    return ['member', 'vip', 'admin', 'developer'].includes(userRole);
  }
  
  if (path.startsWith('/admin/')) {
    return userRole === 'admin' || userRole === 'developer';
  }
  
  // 默认拒绝访问
  return false;
};
