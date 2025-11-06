/**
 * 活动订单调试工具
 * 用于检查活动数据、雪茄分配和订单创建状态
 */

import { getEventById, getOrdersByUser, getEventsByUser } from '../services/firebase/firestore'
import type { Event, Order } from '../types'

export interface EventOrderDebugInfo {
  event: Event | null
  eventStatus: string
  hasAllocations: boolean
  allocationsCount: number
  allocations: any
  registeredUsers: string[]
  ordersCreated: {
    userId: string
    orderId?: string
    hasOrder: boolean
    orderDetails?: Order
  }[]
  summary: {
    totalRegistered: number
    totalAllocated: number
    totalOrdersCreated: number
    missingOrders: number
  }
}

/**
 * 检查活动的订单创建状态
 */
export const debugEventOrders = async (eventId: string): Promise<EventOrderDebugInfo> => {
  try {
    // 1. 获取活动数据
    const event = await getEventById(eventId)
    
    if (!event) {
      return {
        event: null,
        eventStatus: 'NOT_FOUND',
        hasAllocations: false,
        allocationsCount: 0,
        allocations: {},
        registeredUsers: [],
        ordersCreated: [],
        summary: {
          totalRegistered: 0,
          totalAllocated: 0,
          totalOrdersCreated: 0,
          missingOrders: 0
        }
      }
    }

    // 2. 提取分配数据
    const allocations = (event as any)?.allocations || {}
    const registeredUsers = event.participants?.registered || []
    const allocationsCount = Object.keys(allocations).length

    // 3. 检查每个用户的订单创建状态
    const ordersCreated = []
    let totalOrdersCreated = 0

    for (const userId of registeredUsers) {
      const allocation = allocations[userId]
      const orderId = allocation?.orderId

      // 检查订单是否真实存在
      let orderDetails: Order | undefined
      let hasOrder = false

      if (orderId) {
        // 通过 userId 获取所有订单，然后查找匹配的
        const userOrders = await getOrdersByUser(userId)
        orderDetails = userOrders.find(order => order.id === orderId)
        hasOrder = !!orderDetails
        if (hasOrder) {
          totalOrdersCreated++
        }
      }

      ordersCreated.push({
        userId,
        orderId,
        hasOrder,
        orderDetails
      })
    }

    // 4. 生成摘要
    const summary = {
      totalRegistered: registeredUsers.length,
      totalAllocated: allocationsCount,
      totalOrdersCreated,
      missingOrders: registeredUsers.length - totalOrdersCreated
    }

    return {
      event,
      eventStatus: event.status || 'UNKNOWN',
      hasAllocations: allocationsCount > 0,
      allocationsCount,
      allocations,
      registeredUsers,
      ordersCreated,
      summary
    }
  } catch (error) {
    throw error
  }
}

/**
 * 打印调试信息到控制台
 */
export const printEventOrderDebug = async (eventId: string) => {

  const info = await debugEventOrders(eventId)

  if (!info.event) {
    return info
  }





  info.ordersCreated.forEach((item, index) => {
    if (item.orderDetails) {
    }
  })

  if (info.eventStatus !== 'completed') {
  }
  if (!info.hasAllocations) {
  }
  if (info.summary.missingOrders > 0) {
  }
  if (info.summary.totalOrdersCreated === info.summary.totalRegistered && info.summary.totalRegistered > 0) {
  }

  
  return info
}

/**
 * 检查用户的所有订单
 */
export const debugUserOrders = async (userId: string) => {

  try {
    const orders = await getOrdersByUser(userId)
    const events = await getEventsByUser(userId)


    if (orders.length === 0) {
    } else {
      orders.forEach((order, index) => {
        if ((order as any).source?.type === 'event') {
        }
      })
    }


    if (events.length === 0) {
    } else {
      events.forEach((event, index) => {
        
        const allocation = (event as any)?.allocations?.[userId]
        if (allocation) {
        }
      })
    }

    const eventsWithAllocations = events.filter(e => (e as any)?.allocations?.[userId])
    const eventsCompleted = events.filter(e => e.status === 'completed')
    const eventsWithOrderId = events.filter(e => (e as any)?.allocations?.[userId]?.orderId)


    if (eventsWithAllocations.length > 0 && orders.length === 0) {
    }

  } catch (error) {
  }

}

