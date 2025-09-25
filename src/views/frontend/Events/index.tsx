// 活动页面
import React, { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, Typography, Button, Tag, Space, Avatar, message } from 'antd'
import { 
  CalendarOutlined, 
  EnvironmentOutlined, 
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined 
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
      setEvents(list)
    })()
  }, [])

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
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ margin: 10, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.events')}</Title>
      <Paragraph type="secondary">
        {t('events.subtitle')}
      </Paragraph>

      <Row gutter={[16, 16]}>
        {events.map((event) => (
          <Col span={8} key={event.id}>
            <Card
              hoverable
              cover={
                <div style={{ height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                </div>
              }
              actions={[
                <Button 
                  type="primary" 
                  disabled={event.status === 'completed' || !user}
                  loading={loadingId === event.id}
                  style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}
                  onClick={async () => {
                    if (!user) {
                      message.info('请先登录后再报名')
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
                        setEvents(updated)
                      } else {
                        message.error(t('messages.operationFailed'))
                      }
                    } finally {
                      setLoadingId(null)
                    }
                  }}
                >
                  {(() => {
                    if (event.status === 'completed') return t('events.completed')
                    if (!user) return t('auth.pleaseLogin')
                    const registeredIds = event.participants?.registered || []
                    return registeredIds.includes(user.id) ? t('events.leave') : t('events.join')
                  })()}
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <Space>
                    {event.title}
                    <Tag color={getStatusColor(event.status)}>
                      {getStatusText(event.status)}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph ellipsis={{ rows: 2 }}>
                      {event.description}
                    </Paragraph>
                    
                    <Space>
                      <CalendarOutlined />
                      <Text>
                        {(() => {
                          const d = (event as any)?.schedule?.startDate as any
                          const dateVal = (d as any)?.toDate ? (d as any).toDate() : d
                          return dateVal ? new Date(dateVal).toLocaleDateString() : '-'
                        })()}
                      </Text>
                    </Space>
                    
                    {/* 选填：结束时间展示 */}
                    
                    <Space>
                      <EnvironmentOutlined />
                      <Text>{(event as any)?.location?.name || '-'}</Text>
                    </Space>
                    
                    <Space>
                      <DollarOutlined />
                      <Text strong>RM{(event as any)?.participants?.fee ?? 0}</Text>
                    </Space>
                    
                    <Space>
                      <TeamOutlined />
                      <Text>
                        {(() => {
                          const reg = (event as any)?.participants?.registered || []
                          const max = (event as any)?.participants?.maxParticipants || 0
                          return `${reg.length}/${max} ${t('events.people')}`
                        })()}
                      </Text>
                    </Space>
                    
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                      <Avatar size="small" style={{ marginRight: 8 }}>
                        {String((event as any)?.organizerId || '主').slice(0,1)}
                      </Avatar>
                      <Text type="secondary">{t('events.organizer')}: {(event as any)?.organizerId || '-'}</Text>
                    </div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Events
