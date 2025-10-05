import React from 'react'
import dayjs from 'dayjs'
import type { Event } from '../../types'
import { useTranslation } from 'react-i18next'

interface EventCardProps {
  event: Event
  onView: (event: Event) => void
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onView,
  getStatusText,
  getStatusColor
}) => {
  const { t } = useTranslation()

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
