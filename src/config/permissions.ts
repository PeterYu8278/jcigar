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
  }
};

// 路由权限配置
export const ROUTE_PERMISSIONS = {
  '/': ['guest', 'member', 'admin'],
  '/events': ['guest', 'member', 'admin'],
  '/shop': ['member', 'admin'],
  '/profile': ['member', 'admin'],
  '/admin': ['admin'],
  '/admin/users': ['admin'],
  '/admin/inventory': ['admin'],
  '/admin/events': ['admin'],
  '/admin/orders': ['admin'],
  '/admin/finance': ['admin'],
};

// 权限检查函数
export const hasPermission = (userRole: UserRole, permission: keyof Permission): boolean => {
  return ROLE_PERMISSIONS[userRole][permission];
};

// 路由权限检查函数
export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
  const allowedRoles = ROUTE_PERMISSIONS[path as keyof typeof ROUTE_PERMISSIONS];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
};
