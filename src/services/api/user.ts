/**
 * 用户相关 API
 */

import { apiCall, type ApiConfig } from './base'
import * as firestoreService from '../firebase/firestore'
import type { User } from '../../types'

/**
 * 获取用户列表
 */
export const getUserList = (config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getAllUsers(),
    config
  )
}

/**
 * 获取用户详情
 */
export const getUserById = (userId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getUserById(userId),
    config
  )
}

/**
 * 创建用户
 */
export const createUser = (userData: Omit<User, 'id'>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.createDocument('users', userData),
    {
      showSuccess: true,
      successMessage: '用户创建成功',
      ...config
    }
  )
}

/**
 * 更新用户
 */
export const updateUser = (userId: string, userData: Partial<User>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateDocument('users', userId, userData),
    {
      showSuccess: true,
      successMessage: '用户更新成功',
      ...config
    }
  )
}

/**
 * 删除用户
 */
export const deleteUser = (userId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.deleteDocument('users', userId),
    {
      showSuccess: true,
      successMessage: '用户删除成功',
      ...config
    }
  )
}

/**
 * 批量删除用户
 */
export const batchDeleteUsers = (userIds: string[], config?: ApiConfig) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        userIds.map(id => firestoreService.deleteDocument('users', id))
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功删除 ${userIds.length} 个用户`,
      ...config
    }
  )
}

/**
 * 搜索用户
 */
export const searchUsers = (keyword: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const users = await firestoreService.getAllUsers()
      
      if (!keyword) return users

      const lowerKeyword = keyword.toLowerCase()
      return users.filter((user: User) =>
        user.displayName?.toLowerCase().includes(lowerKeyword) ||
        user.email?.toLowerCase().includes(lowerKeyword) ||
        user.profile?.phone?.includes(keyword)
      )
    },
    config
  )
}

/**
 * 更新用户状态
 */
export const updateUserStatus = (
  userId: string,
  status: 'active' | 'inactive' | 'suspended',
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateDocument('users', userId, { status }),
    {
      showSuccess: true,
      successMessage: '用户状态更新成功',
      ...config
    }
  )
}

/**
 * 更新用户角色
 */
export const updateUserRole = (
  userId: string,
  role: 'admin' | 'member' | 'guest',
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateDocument('users', userId, { role }),
    {
      showSuccess: true,
      successMessage: '用户角色更新成功',
      ...config
    }
  )
}

