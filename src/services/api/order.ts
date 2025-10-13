/**
 * 订单相关 API
 */

import { apiCall, ApiConfig } from './base'
import * as firestoreService from '../firebase/firestore'
import type { Order } from '../../types'

/**
 * 获取订单列表
 */
export const getOrderList = (config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getAllOrders(),
    config
  )
}

/**
 * 根据用户获取订单列表
 */
export const getOrdersByUser = (userId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getOrdersByUser(userId),
    config
  )
}

/**
 * 获取订单详情
 */
export const getOrderById = (orderId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getOrderById(orderId),
    config
  )
}

/**
 * 创建订单
 */
export const createOrder = (orderData: Omit<Order, 'id'>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.createOrder(orderData),
    {
      showSuccess: true,
      successMessage: '订单创建成功',
      ...config
    }
  )
}

/**
 * 更新订单
 */
export const updateOrder = (orderId: string, orderData: Partial<Order>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateOrder(orderId, orderData),
    {
      showSuccess: true,
      successMessage: '订单更新成功',
      ...config
    }
  )
}

/**
 * 删除订单
 */
export const deleteOrder = (orderId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.deleteOrder(orderId),
    {
      showSuccess: true,
      successMessage: '订单删除成功',
      ...config
    }
  )
}

/**
 * 批量删除订单
 */
export const batchDeleteOrders = (orderIds: string[], config?: ApiConfig) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        orderIds.map(id => firestoreService.deleteOrder(id))
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功删除 ${orderIds.length} 个订单`,
      ...config
    }
  )
}

/**
 * 更新订单状态
 */
export const updateOrderStatus = (
  orderId: string,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateOrder(orderId, { status }),
    {
      showSuccess: true,
      successMessage: '订单状态更新成功',
      ...config
    }
  )
}

/**
 * 更新支付状态
 */
export const updatePaymentStatus = (
  orderId: string,
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partial_refund',
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateOrder(orderId, { paymentStatus }),
    {
      showSuccess: true,
      successMessage: '支付状态更新成功',
      ...config
    }
  )
}

/**
 * 取消订单
 */
export const cancelOrder = (orderId: string, reason?: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateOrder(orderId, {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: new Date()
    }),
    {
      showSuccess: true,
      successMessage: '订单已取消',
      ...config
    }
  )
}

/**
 * 搜索订单
 */
export const searchOrders = (keyword: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const orders = await firestoreService.getAllOrders()
      
      if (!keyword) return orders

      const lowerKeyword = keyword.toLowerCase()
      return orders.filter((order: Order) =>
        order.id?.toLowerCase().includes(lowerKeyword) ||
        order.userName?.toLowerCase().includes(lowerKeyword) ||
        order.userPhone?.includes(keyword)
      )
    },
    config
  )
}

/**
 * 根据状态筛选订单
 */
export const getOrdersByStatus = (
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  config?: ApiConfig
) => {
  return apiCall(
    async () => {
      const orders = await firestoreService.getAllOrders()
      return orders.filter((order: Order) => order.status === status)
    },
    config
  )
}

/**
 * 根据支付状态筛选订单
 */
export const getOrdersByPaymentStatus = (
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partial_refund',
  config?: ApiConfig
) => {
  return apiCall(
    async () => {
      const orders = await firestoreService.getAllOrders()
      return orders.filter((order: Order) => order.paymentStatus === paymentStatus)
    },
    config
  )
}

