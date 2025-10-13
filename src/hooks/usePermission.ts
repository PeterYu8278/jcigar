/**
 * 权限相关 Hook
 * 提供统一的权限判断逻辑
 */

import { useMemo } from 'react'
import { useAuthStore } from '../store/modules/auth'
import { ROLE_PERMISSIONS, canAccessRoute } from '../config/permissions'
import type { Permission, UserRole } from '../types'

/**
 * 权限 Hook 返回值
 */
export interface UsePermissionReturn {
  /** 用户角色 */
  role: UserRole | null
  /** 是否为访客 */
  isGuest: boolean
  /** 是否为会员 */
  isMember: boolean
  /** 是否为管理员 */
  isAdmin: boolean
  /** 用户所有权限 */
  permissions: Permission | null
  /** 检查单个权限 */
  hasPermission: (permission: keyof Permission) => boolean
  /** 检查多个权限（需要全部满足） */
  hasAllPermissions: (permissions: Array<keyof Permission>) => boolean
  /** 检查多个权限（满足任一即可） */
  hasAnyPermission: (permissions: Array<keyof Permission>) => boolean
  /** 检查路由访问权限 */
  canAccessRoute: (path: string) => boolean
}

/**
 * 权限 Hook
 * 
 * @example
 * ```tsx
 * const {
 *   isAdmin,
 *   isMember,
 *   hasPermission,
 *   hasAllPermissions,
 *   canAccessRoute
 * } = usePermission()
 * 
 * // 检查单个权限
 * if (hasPermission('canManageInventory')) {
 *   // 显示库存管理功能
 * }
 * 
 * // 检查多个权限（全部满足）
 * if (hasAllPermissions(['canManageInventory', 'canManageOrders'])) {
 *   // 显示高级管理功能
 * }
 * 
 * // 检查路由权限
 * if (canAccessRoute('/admin/users')) {
 *   // 可以访问用户管理页面
 * }
 * 
 * // 角色判断
 * if (isAdmin) {
 *   // 管理员功能
 * } else if (isMember) {
 *   // 会员功能
 * }
 * ```
 */
export const usePermission = (): UsePermissionReturn => {
  const { user, isAdmin: isAdminFromStore, hasPermission: hasPermissionFromStore } = useAuthStore()

  const role = user?.role ?? null

  // 角色判断
  const isGuest = role === 'guest'
  const isMember = role === 'member'
  const isAdmin = isAdminFromStore

  // 获取用户所有权限
  const permissions = useMemo(() => {
    if (!role) return null
    return ROLE_PERMISSIONS[role]
  }, [role])

  /**
   * 检查单个权限
   */
  const hasPermission = (permission: keyof Permission): boolean => {
    return hasPermissionFromStore(permission)
  }

  /**
   * 检查多个权限（需要全部满足）
   */
  const hasAllPermissions = (requiredPermissions: Array<keyof Permission>): boolean => {
    if (!role) return false
    return requiredPermissions.every(permission => hasPermission(permission))
  }

  /**
   * 检查多个权限（满足任一即可）
   */
  const hasAnyPermission = (requiredPermissions: Array<keyof Permission>): boolean => {
    if (!role) return false
    return requiredPermissions.some(permission => hasPermission(permission))
  }

  /**
   * 检查路由访问权限
   */
  const checkRouteAccess = (path: string): boolean => {
    if (!role) return false
    return canAccessRoute(role, path)
  }

  return {
    role,
    isGuest,
    isMember,
    isAdmin,
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessRoute: checkRouteAccess
  }
}

/**
 * 条件渲染组件 - 基于权限
 * 
 * @example
 * ```tsx
 * // 单个权限
 * <PermissionGuard permission="canManageInventory">
 *   <InventoryManagement />
 * </PermissionGuard>
 * 
 * // 多个权限（全部满足）
 * <PermissionGuard permissions={['canManageInventory', 'canManageOrders']} requireAll>
 *   <AdvancedManagement />
 * </PermissionGuard>
 * 
 * // 多个权限（满足任一）
 * <PermissionGuard permissions={['canManageInventory', 'canManageOrders']}>
 *   <SomeFeature />
 * </PermissionGuard>
 * 
 * // 基于角色
 * <PermissionGuard roles={['admin']}>
 *   <AdminPanel />
 * </PermissionGuard>
 * 
 * // 自定义无权限时的显示
 * <PermissionGuard permission="canManageInventory" fallback={<NoPermission />}>
 *   <InventoryManagement />
 * </PermissionGuard>
 * ```
 */
export interface PermissionGuardProps {
  /** 子组件 */
  children: React.ReactNode
  /** 单个权限（与 permissions 二选一） */
  permission?: keyof Permission
  /** 多个权限 */
  permissions?: Array<keyof Permission>
  /** 是否需要满足所有权限（默认 false，满足任一即可） */
  requireAll?: boolean
  /** 角色限制（满足任一角色即可） */
  roles?: UserRole[]
  /** 无权限时显示的内容（默认不显示） */
  fallback?: React.ReactNode
}

export function PermissionGuard(props: PermissionGuardProps) {
  const {
    children,
    permission,
    permissions,
    requireAll = false,
    roles,
    fallback = null
  } = props

  const { role, hasPermission, hasAllPermissions, hasAnyPermission } = usePermission()

  // 角色检查
  if (roles && roles.length > 0) {
    if (!role || !roles.includes(role)) {
      return React.createElement(React.Fragment, null, fallback)
    }
  }

  // 单个权限检查
  if (permission) {
    if (!hasPermission(permission)) {
      return React.createElement(React.Fragment, null, fallback)
    }
  }

  // 多个权限检查
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasAccess) {
      return React.createElement(React.Fragment, null, fallback)
    }
  }

  return React.createElement(React.Fragment, null, children)
}

/**
 * 条件渲染 Hook - 基于权限
 * 返回一个函数，可用于条件渲染
 * 
 * @example
 * ```tsx
 * const renderIf = usePermissionRender()
 * 
 * return (
 *   <div>
 *     {renderIf('canManageInventory', <InventoryButton />)}
 *     {renderIf(['canManageInventory', 'canManageOrders'], <AdvancedButton />, { requireAll: true })}
 *   </div>
 * )
 * ```
 */
export const usePermissionRender = () => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermission()

  return (
    permissionOrPermissions: keyof Permission | Array<keyof Permission>,
    component: React.ReactNode,
    options?: { requireAll?: boolean; fallback?: React.ReactNode }
  ): React.ReactNode => {
    const { requireAll = false, fallback = null } = options || {}

    let hasAccess = false

    if (Array.isArray(permissionOrPermissions)) {
      hasAccess = requireAll
        ? hasAllPermissions(permissionOrPermissions)
        : hasAnyPermission(permissionOrPermissions)
    } else {
      hasAccess = hasPermission(permissionOrPermissions)
    }

    return hasAccess ? component : fallback
  }
}

/**
 * 角色守卫组件
 * 简化版的权限守卫，仅基于角色
 * 
 * @example
 * ```tsx
 * // 仅管理员可见
 * <RoleGuard roles={['admin']}>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * // 会员和管理员可见
 * <RoleGuard roles={['member', 'admin']}>
 *   <MemberFeature />
 * </RoleGuard>
 * ```
 */
export interface RoleGuardProps {
  children: React.ReactNode
  roles: UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard(props: RoleGuardProps) {
  const { children, roles, fallback = null } = props
  const { role } = usePermission()

  if (!role || !roles.includes(role)) {
    return React.createElement(React.Fragment, null, fallback)
  }

  return React.createElement(React.Fragment, null, children)
}

// 导入 React
import React from 'react'

