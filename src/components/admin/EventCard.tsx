import React from 'react'
import dayjs from 'dayjs'
import type { Event } from '../../types'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/modules/auth'

interface EventCardProps {
  event: Event
  onView: (event: Event) => void
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
  completedEvents?: Event[] // 已完成的活动列表，用于计算社交关系
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onView,
  getStatusText,
  getStatusColor,
  completedEvents = []
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  // 计算参与者社交关系（基于当前登录用户）
  const getSocialRelationTag = (): { color: string } | null => {
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

  const socialTag = getSocialRelationTag()

  return (
    <div style={{ 
      position: 'relative', 
      overflow: 'hidden', 
      border: '1px solid rgba(244,175,37,0.2)', 
      borderRadius: 16 
    }}>
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'linear-gradient(135deg, rgba(17,17,17,0.6), rgba(34,34,34,0.2))' 
      }} />
      <div style={{ 
        position: 'relative', 
        padding: 12, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: 12, 
          alignItems: 'flex-start' 
        }}>
          <div style={{ 
            width: 96, 
            height: 96, 
            borderRadius: 10, 
            border: '2px solid rgba(244,175,37,0.3)', 
            overflow: 'hidden', 
            flexShrink: 0, 
            background: 'rgba(255,255,255,0.08)' 
          }}>
            <img
              alt="Cigar tasting event"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3TPYA6HpEVbfOqeAlldyTpfRbZwZ9wVZj9g8I86EoGVp8OK7y3oaPnOiU6GHKmfigRsbbWXOQwVYSJCIbWhineKZyQ_uhh7CJnxR77vabe8ahQ9evdKcCVOKrY_vTtZMJ-ROZjjwVtgXWgMUOb0oLSUYvKJwxxaMvS07GvaklyNsDauAMi0All4B5FdXY5GJd5aUXsIcZ0qgD7FM9qbryFWovrU9DUGHTSTTPHjBKGzOc9q_DNLQ8HVfN70au4uIyFXy9D5Az6Rnt"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            {/* 活动名称 + 状态 同行显示 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 8 
            }}>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 800, 
                color: '#fff', 
                flex: 1, 
                marginRight: 8 
              }}>
                {event.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                <span style={{ 
                  fontSize: 12, 
                  padding: '2px 8px', 
                  borderRadius: 9999, 
                  background: event.status === 'published' ? 'rgba(34,197,94,0.2)' : 
                             event.status === 'ongoing' ? 'rgba(56,189,248,0.2)' : 
                             event.status === 'completed' ? 'rgba(148,163,184,0.2)' : 
                             'rgba(244,63,94,0.2)', 
                  color: event.status === 'published' ? '#34d399' : 
                         event.status === 'ongoing' ? '#38bdf8' : 
                         event.status === 'completed' ? '#94a3b8' : 
                         '#f87171', 
                  flexShrink: 0 
                }}>
                  {getStatusText(event.status)}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              <div style={{ 
                fontSize: 12, 
                color: '#f4af25', 
                fontWeight: 600, 
                marginBottom: 4 
              }}>
                {t('events.participants')}: {((event as any)?.participants?.registered || []).length}
              </div>
              {(() => {
                const s = (event as any)?.schedule?.startDate
                const e = (event as any)?.schedule?.endDate
                const sd = (s as any)?.toDate ? (s as any).toDate() : s
                const ed = (e as any)?.toDate ? (e as any).toDate() : e
                const time = sd && ed ? `${dayjs(sd).format('YYYY-MM-DD HH:mm')} - ${dayjs(ed).format('HH:mm')}` : '-'
                const loc = (event as any)?.location?.name || ''
                return `${time} | ${loc}`
              })()}
            </div>
          </div>
        </div>
        <div style={{ 
          padding: '2px 8px',
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: 8 
        }}>
          <button 
            style={{ 
              padding: '4px 8px', 
              borderRadius: 6, 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#221c10', 
              fontWeight: 600, 
              fontSize: 12, 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }} 
            onClick={() => onView(event)}
          >
            {t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventCard
