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
    console.error('Debug event orders error:', error)
    throw error
  }
}

/**
 * 打印调试信息到控制台
 */
export const printEventOrderDebug = async (eventId: string) => {
  console.log('🔍 ========== 活动订单调试开始 ==========')
  console.log(`活动ID: ${eventId}`)
  console.log('')

  const info = await debugEventOrders(eventId)

  if (!info.event) {
    console.error('❌ 活动不存在')
    return info
  }

  console.log('📋 活动信息:')
  console.log(`  标题: ${info.event.title}`)
  console.log(`  状态: ${info.eventStatus}`)
  console.log('')

  console.log('👥 参与者信息:')
  console.log(`  已报名用户数: ${info.summary.totalRegistered}`)
  console.log(`  已报名用户ID:`, info.registeredUsers)
  console.log('')

  console.log('🚬 雪茄分配信息:')
  console.log(`  有分配数据: ${info.hasAllocations ? '是' : '否'}`)
  console.log(`  分配数量: ${info.allocationsCount}`)
  console.log(`  分配详情:`, info.allocations)
  console.log('')

  console.log('📦 订单创建状态:')
  console.log(`  已创建订单数: ${info.summary.totalOrdersCreated}`)
  console.log(`  缺失订单数: ${info.summary.missingOrders}`)
  console.log('')

  console.log('📊 详细订单状态:')
  info.ordersCreated.forEach((item, index) => {
    console.log(`  用户 ${index + 1}:`)
    console.log(`    用户ID: ${item.userId}`)
    console.log(`    订单ID: ${item.orderId || '无'}`)
    console.log(`    订单存在: ${item.hasOrder ? '✅ 是' : '❌ 否'}`)
    if (item.orderDetails) {
      console.log(`    订单状态: ${item.orderDetails.status}`)
      console.log(`    订单金额: RM ${item.orderDetails.total || 0}`)
      console.log(`    商品数量: ${item.orderDetails.items?.length || 0}`)
    }
    console.log('')
  })

  console.log('💡 诊断建议:')
  if (info.eventStatus !== 'completed') {
    console.warn(`  ⚠️ 活动状态为 "${info.eventStatus}"，需要改为 "completed" 才会自动创建订单`)
  }
  if (!info.hasAllocations) {
    console.warn(`  ⚠️ 活动没有雪茄分配数据，请先为参与者分配雪茄`)
  }
  if (info.summary.missingOrders > 0) {
    console.warn(`  ⚠️ 有 ${info.summary.missingOrders} 个用户缺少订单`)
    console.warn(`  建议：将活动状态改为"已完成"以触发订单创建`)
  }
  if (info.summary.totalOrdersCreated === info.summary.totalRegistered && info.summary.totalRegistered > 0) {
    console.log(`  ✅ 所有用户的订单都已创建`)
  }

  console.log('🔍 ========== 调试结束 ==========')
  
  return info
}

/**
 * 检查用户的所有订单
 */
export const debugUserOrders = async (userId: string) => {
  console.log('🔍 ========== 用户订单调试 ==========')
  console.log(`用户ID: ${userId}`)
  console.log('')

  try {
    const orders = await getOrdersByUser(userId)
    const events = await getEventsByUser(userId)

    console.log('📦 订单信息:')
    console.log(`  订单总数: ${orders.length}`)
    console.log('')

    if (orders.length === 0) {
      console.warn('  ⚠️ 该用户没有任何订单')
    } else {
      orders.forEach((order, index) => {
        console.log(`  订单 ${index + 1}:`)
        console.log(`    ID: ${order.id}`)
        console.log(`    状态: ${order.status}`)
        console.log(`    金额: RM ${order.total || 0}`)
        console.log(`    商品数: ${order.items?.length || 0}`)
        console.log(`    来源: ${(order as any).source?.type || '直接销售'}`)
        if ((order as any).source?.type === 'event') {
          console.log(`    活动ID: ${(order as any).source?.eventId}`)
        }
        console.log(`    创建时间: ${order.createdAt}`)
        console.log('')
      })
    }

    console.log('📅 活动参与:')
    console.log(`  参与活动数: ${events.length}`)
    console.log('')

    if (events.length === 0) {
      console.warn('  ⚠️ 该用户没有参与任何活动')
    } else {
      events.forEach((event, index) => {
        console.log(`  活动 ${index + 1}:`)
        console.log(`    标题: ${event.title}`)
        console.log(`    状态: ${event.status}`)
        console.log(`    开始日期: ${event.schedule?.startDate}`)
        
        const allocation = (event as any)?.allocations?.[userId]
        console.log(`    有分配: ${allocation ? '✅ 是' : '❌ 否'}`)
        if (allocation) {
          console.log(`    分配详情:`, allocation)
          console.log(`    订单ID: ${allocation.orderId || '无'}`)
        }
        console.log('')
      })
    }

    console.log('💡 诊断:')
    const eventsWithAllocations = events.filter(e => (e as any)?.allocations?.[userId])
    const eventsCompleted = events.filter(e => e.status === 'completed')
    const eventsWithOrderId = events.filter(e => (e as any)?.allocations?.[userId]?.orderId)

    console.log(`  参与的活动数: ${events.length}`)
    console.log(`  有雪茄分配的活动: ${eventsWithAllocations.length}`)
    console.log(`  已完成的活动: ${eventsCompleted.length}`)
    console.log(`  已记录订单ID的活动: ${eventsWithOrderId.length}`)
    console.log(`  实际订单数: ${orders.length}`)

    if (eventsWithAllocations.length > 0 && orders.length === 0) {
      console.warn('  ⚠️ 有雪茄分配但没有订单，可能的原因:')
      console.warn('     1. 活动还未设为"已完成"状态')
      console.warn('     2. 订单创建过程出错')
      console.warn('     3. 分配数据格式不正确')
    }

  } catch (error) {
    console.error('❌ 调试出错:', error)
  }

  console.log('🔍 ========== 调试结束 ==========')
}

