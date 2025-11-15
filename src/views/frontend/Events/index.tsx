// 活动页面
import React, { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, Typography, Button, Tag, Space, Avatar, message } from 'antd'
import { 
  CalendarOutlined, 
  EnvironmentOutlined, 
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

import { getEvents, registerForEvent, unregisterFromEvent } from '../../../services/firebase/firestore'
import { useAuthStore } from '../../../store/modules/auth'
import type { Event } from '../../../types'
import { useTranslation } from 'react-i18next'

const Events: React.FC = () => {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [events, setEvents] = useState<Event[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const list = await getEvents()
      // 过滤掉私人活动
      const publicEvents = list.filter(event => !event.isPrivate)
      setEvents(publicEvents)
    })()
  }, [])

  // 获取所有已完成的活动，用于计算社交关系
  const completedEvents = useMemo(() => {
    return events.filter(e => e.status === 'completed')
  }, [events])

  // 计算参与者社交关系（基于当前登录用户）
  const getSocialRelationTag = (event: Event): { color: string } | null => {
    // 如果没有登录用户，不显示 tag
    if (!user || !user.id) {
      return null
    }

    const currentParticipants = (event?.participants?.registered || []) as string[]
    
    // 检查当前登录用户是否参与了当前活动
    const isUserParticipating = currentParticipants.includes(user.id)
    
    // 如果用户没有参与当前活动，不显示 tag
    if (!isUserParticipating) {
      return null
    }

    // 找出当前登录用户参与过的所有已完成活动
    const userCompletedEvents = completedEvents.filter(completedEvent => {
      const completedParticipants = (completedEvent?.participants?.registered || []) as string[]
      return completedParticipants.includes(user.id)
    })

    // 如果没有参与过任何已完成的活动，不显示 tag
    if (userCompletedEvents.length === 0) {
      return null
    }

    // 从用户参与过的已完成活动中，收集所有其他参与者（排除用户自己）
    const familiarParticipants = new Set<string>()
    for (const completedEvent of userCompletedEvents) {
      const completedParticipants = (completedEvent?.participants?.registered || []) as string[]
      for (const participantId of completedParticipants) {
        // 排除用户自己
        if (participantId !== user.id) {
          familiarParticipants.add(participantId)
        }
      }
    }

    // 在当前活动的参与者中，找出这些"共同参与者"（排除用户自己）
    const commonParticipants = currentParticipants.filter(id => 
      id !== user.id && familiarParticipants.has(id)
    )
    const overlapCount = commonParticipants.length

    // 如果没有找到任何共同参与者，不显示 tag
    if (overlapCount === 0) {
      return null
    }

    // 根据共同参与者人数返回不同颜色
    // < 5 人：青色 (cyan) - 较弱的个人社交关系
    // >= 5 人：橙色 (orange) - 较强的个人社交关系
    const tagColor = overlapCount < 5 ? '#13c2c2' : '#ff7a00'

    return { color: tagColor }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'blue'
      case 'ongoing': return 'green'
      case 'completed': return 'default'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return t('events.upcoming')
      case 'ongoing': return t('events.ongoing')
      case 'completed': return t('events.completed')
      default: return t('events.unknown')
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1px',
        background: 'transparent',
        backdropFilter: 'blur(10px)'
      }}>
        
        <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 12 }}>{t('navigation.events')}</h1>
        
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {events.map((event) => {
          const socialTag = getSocialRelationTag(event)
          return (
          <div 
            key={event.id}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
              height: '192px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {/* Background Image */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCHkrz9j7PM4w5oJ-Ev89VkzHjq_v56FKnoLokAM_pzgzM6iNfbhlUqD41_YlPuL4JuB_cB8FzngJx-Ha2y__35Q0NvH6BwubyOXdY9GvnvbwOpdZ6Edy1OyMJPkfG6-efD4YBYLZSO1BFlMu6u6T3Vujsd4rKIgWOwxgLHVkDsWwS72e271qwxZ4vothKhf_zW-CiGBhoIQQsvWO9zQCYJuVevXIVGOwLdkBIDO_b0EdZISgCxP0RGVW71K71lUAE_lwj27PQZiuVb")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'transform 0.5s ease'
            }} />
            
            {/* Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(1px)'
            }} />
            
            {/* Content */}
            <div style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px',
              height: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: '4px'
            }}>
              <h2 style={{
                color: '#FFFFFF',
                fontSize: '20px',
                fontWeight: 'bold',
                lineHeight: '1.2',
                margin: 0,
                  flex: 1
              }}>
                {event.title}
              </h2>
                {/* 社交关系 tag */}
                {socialTag && (
                  <span style={{ 
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: socialTag.color,
                    flexShrink: 0,
                    display: 'inline-block'
                  }} />
                )}
              </div>
              
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                margin: 0,
                marginBottom: '16px'
              }}>
                {(() => {
                  const d = (event as any)?.schedule?.startDate as any
                  const dateVal = (d as any)?.toDate ? (d as any).toDate() : d
                  return dateVal ? new Date(dateVal).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'
                })()}
              </p>
              
              <button
                disabled={event.status === 'completed' || !user}
                style={{
                  alignSelf: 'flex-start',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  color: '#111',
                  fontWeight: 'bold',
                  padding: '8px 24px',
                  borderRadius: '9999px',
                  cursor: event.status === 'completed' || !user ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(244, 175, 37, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: event.status === 'completed' || !user ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (event.status !== 'completed' && user) {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 175, 37, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (event.status !== 'completed' && user) {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(244, 175, 37, 0.3)'
                  }
                }}
                onClick={async () => {
                  if (!user) {
                    message.info(t('auth.pleaseLogin'))
                    return
                  }
                  const max = (event as any)?.participants?.maxParticipants || 0
                  const registeredIds = event.participants?.registered || []
                  const isFull = max > 0 && registeredIds.length >= max
                  if (!isFull) {
                    // ok
                  } else if (!registeredIds.includes(user.id)) {
                    message.warning(t('events.fullCapacity'))
                    return
                  }
                  try {
                    setLoadingId(event.id)
                    const isRegistered = registeredIds.includes(user.id)
                    const res = isRegistered
                      ? await unregisterFromEvent(event.id, user.id)
                      : await registerForEvent(event.id, user.id)
                    if (res.success) {
                      message.success(isRegistered ? t('events.unregistered') : t('events.registered'))
                      const updated = await getEvents()
                      // 过滤掉私人活动
                      const publicEvents = updated.filter(e => !e.isPrivate)
                      setEvents(publicEvents)
                    } else {
                      message.error(t('messages.operationFailed'))
                    }
                  } finally {
                    setLoadingId(null)
                  }
                }}
              >
                {loadingId === event.id ? '处理中...' : (() => {
                  if (event.status === 'completed') return t('events.completed')
                  if (!user) return t('auth.pleaseLogin')
                  const registeredIds = event.participants?.registered || []
                  return registeredIds.includes(user.id) ? t('events.leave') : t('events.join')
                })()}
              </button>
            </div>
                    </div>
          )
        })}
      </div>
    </div>
  )
}

export default Events
