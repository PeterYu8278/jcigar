/**
 * 活动相关 API
 */

import { apiCall, type ApiConfig } from './base'
import * as firestoreService from '../firebase/firestore'
import type { Event } from '../../types'
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections'

/**
 * 获取活动列表
 */
export const getEventList = (config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getEvents(),
    config
  )
}

/**
 * 获取活动详情
 */
export const getEventById = (eventId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getEventById(eventId),
    config
  )
}

/**
 * 创建活动
 */
export const createEvent = (eventData: Omit<Event, 'id'>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.createDocument(GLOBAL_COLLECTIONS.EVENTS, eventData),
    {
      showSuccess: true,
      successMessage: '活动创建成功',
      ...config
    }
  )
}

/**
 * 更新活动
 */
export const updateEvent = (eventId: string, eventData: Partial<Event>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateDocument(GLOBAL_COLLECTIONS.EVENTS, eventId, eventData),
    {
      showSuccess: true,
      successMessage: '活动更新成功',
      ...config
    }
  )
}

/**
 * 删除活动
 */
export const deleteEvent = (eventId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.deleteDocument(GLOBAL_COLLECTIONS.EVENTS, eventId),
    {
      showSuccess: true,
      successMessage: '活动删除成功',
      ...config
    }
  )
}

/**
 * 批量删除活动
 */
export const batchDeleteEvents = (eventIds: string[], config?: ApiConfig) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        eventIds.map(id => firestoreService.deleteDocument(GLOBAL_COLLECTIONS.EVENTS, id))
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功删除 ${eventIds.length} 个活动`,
      ...config
    }
  )
}

/**
 * 搜索活动
 */
export const searchEvents = (keyword: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const events = await firestoreService.getEvents()
      
      if (!keyword) return events

      const lowerKeyword = keyword.toLowerCase()
      return events.filter((event: Event) =>
        event.title?.toLowerCase().includes(lowerKeyword) ||
        event.description?.toLowerCase().includes(lowerKeyword) ||
        event.location?.name?.toLowerCase().includes(lowerKeyword) ||
        event.location?.address?.toLowerCase().includes(lowerKeyword)
      )
    },
    config
  )
}

/**
 * 用户报名参加活动
 */
export const registerForEvent = (eventId: string, userId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.registerForEvent(eventId, userId),
    {
      showSuccess: true,
      successMessage: '报名成功',
      ...config
    }
  )
}

/**
 * 用户取消报名
 */
export const unregisterFromEvent = (eventId: string, userId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.unregisterFromEvent(eventId, userId),
    {
      showSuccess: true,
      successMessage: '已取消报名',
      ...config
    }
  )
}

/**
 * 获取活动参与者列表
 */
export const getEventParticipants = (eventId: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const event = await firestoreService.getEventById(eventId)
      if (!event) {
        throw new Error('活动不存在')
      }
      return event.participants || []
    },
    config
  )
}

/**
 * 更新活动状态
 */
export const updateEventStatus = (
  eventId: string,
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateDocument(GLOBAL_COLLECTIONS.EVENTS, eventId, { status }),
    {
      showSuccess: true,
      successMessage: '活动状态更新成功',
      ...config
    }
  )
}

/**
 * 取消活动
 */
export const cancelEvent = (eventId: string, reason?: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateDocument(GLOBAL_COLLECTIONS.EVENTS, eventId, {
      status: 'cancelled' as const,
      cancelReason: reason,
      cancelledAt: new Date()
    } as any),
    {
      showSuccess: true,
      successMessage: '活动已取消',
      ...config
    }
  )
}

/**
 * 根据状态筛选活动
 */
export const getEventsByStatus = (
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
  config?: ApiConfig
) => {
  return apiCall(
    async () => {
      const events = await firestoreService.getEvents()
      return events.filter((event: Event) => event.status === status)
    },
    config
  )
}

/**
 * 获取即将开始的活动
 */
export const getUpcomingEvents = (config?: ApiConfig) => {
  return apiCall(
    async () => {
      const events = await firestoreService.getEvents()
      const now = new Date()
      return events.filter((event: Event) => {
        const startDate = event.schedule.startDate instanceof Date 
          ? event.schedule.startDate 
          : new Date(event.schedule.startDate)
        return startDate > now && event.status !== 'cancelled'
      })
    },
    config
  )
}

/**
 * 获取已结束的活动
 */
export const getPastEvents = (config?: ApiConfig) => {
  return apiCall(
    async () => {
      const events = await firestoreService.getEvents()
      const now = new Date()
      return events.filter((event: Event) => {
        const endDate = event.schedule.endDate instanceof Date 
          ? event.schedule.endDate 
          : new Date(event.schedule.endDate)
        return endDate <= now || event.status === 'completed'
      })
    },
    config
  )
}

