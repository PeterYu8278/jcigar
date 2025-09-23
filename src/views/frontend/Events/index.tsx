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

const Events: React.FC = () => {
  const { user } = useAuthStore()
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
      case 'upcoming': return '即将开始'
      case 'ongoing': return '进行中'
      case 'completed': return '已结束'
      default: return '未知'
    }
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: 20, padding: '0 4px' }}>
        <Title level={2} style={{ marginBottom: 8 }}>聚会活动</Title>
        <Paragraph type="secondary" style={{ fontSize: 'clamp(13px, 3vw, 15px)', marginBottom: 0 }}>
          参与我们的雪茄聚会活动，与同好分享品鉴心得
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {events.map((event) => (
          <Col xs={24} sm={12} lg={8} key={event.id}>
            <Card
              className="cigar-card"
              hoverable
              cover={
                <div style={{ 
                  height: 'clamp(150px, 25vw, 200px)', 
                  background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 215, 0, 0.2)'
                }}>
                  <CalendarOutlined style={{ 
                    fontSize: 'clamp(36px, 8vw, 48px)', 
                    color: 'rgba(255, 215, 0, 0.6)',
                    filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.3))'
                  }} />
                </div>
              }
              actions={[
                <Button 
                  type="primary" 
                  disabled={event.status === 'completed' || !user}
                  loading={loadingId === event.id}
                  block
                  style={{
                    height: '44px',
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0a0a0a',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
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
                      message.warning('名额已满')
                      return
                    }
                    try {
                      setLoadingId(event.id)
                      const isRegistered = registeredIds.includes(user.id)
                      const res = isRegistered
                        ? await unregisterFromEvent(event.id, user.id)
                        : await registerForEvent(event.id, user.id)
                      if (res.success) {
                        message.success(isRegistered ? '已取消报名' : '报名成功')
                        const updated = await getEvents()
                        setEvents(updated)
                      } else {
                        message.error('操作失败，请稍后重试')
                      }
                    } finally {
                      setLoadingId(null)
                    }
                  }}
                >
                  {(() => {
                    if (event.status === 'completed') return '已结束'
                    if (!user) return '请登录'
                    const registeredIds = event.participants?.registered || []
                    return registeredIds.includes(user.id) ? '取消报名' : '立即报名'
                  })()}
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Text strong style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', lineHeight: 1.3 }}>
                      {event.title}
                    </Text>
                    <Tag 
                      color={getStatusColor(event.status)}
                      style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {getStatusText(event.status)}
                    </Tag>
                  </div>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph 
                      ellipsis={{ rows: 2 }}
                      style={{ 
                        fontSize: 'clamp(12px, 2.8vw, 14px)', 
                        lineHeight: 1.4, 
                        marginBottom: 12 
                      }}
                    >
                      {event.description}
                    </Paragraph>
                    
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <Space size="small">
                        <CalendarOutlined style={{ color: '#ffd700', fontSize: '14px' }} />
                        <Text style={{ fontSize: '12px', color: '#c0c0c0' }}>
                          {(() => {
                            const d = (event as any)?.schedule?.startDate as any
                            const dateVal = (d as any)?.toDate ? (d as any).toDate() : d
                            return dateVal ? new Date(dateVal).toLocaleDateString() : '-'
                          })()}
                        </Text>
                      </Space>
                      
                      <Space size="small">
                        <EnvironmentOutlined style={{ color: '#ffd700', fontSize: '14px' }} />
                        <Text style={{ fontSize: '12px', color: '#c0c0c0' }}>
                          {(event as any)?.location?.name || '-'}
                        </Text>
                      </Space>
                      
                      <Space size="small">
                        <DollarOutlined style={{ color: '#ffd700', fontSize: '14px' }} />
                        <Text strong style={{ fontSize: '12px', color: '#ffd700' }}>
                          ¥{(event as any)?.participants?.fee ?? 0}
                        </Text>
                      </Space>
                      
                      <Space size="small">
                        <TeamOutlined style={{ color: '#ffd700', fontSize: '14px' }} />
                        <Text style={{ fontSize: '12px', color: '#c0c0c0' }}>
                          {(() => {
                            const reg = (event as any)?.participants?.registered || []
                            const max = (event as any)?.participants?.maxParticipants || 0
                            return `${reg.length}/${max} 人`
                          })()}
                        </Text>
                      </Space>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255, 215, 0, 0.1)'
                    }}>
                      <Avatar 
                        size="small" 
                        style={{ 
                          marginRight: 8,
                          background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                          color: '#0a0a0a',
                          fontSize: '10px'
                        }}
                      >
                        {String((event as any)?.organizerId || '主').slice(0,1)}
                      </Avatar>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        主办：{(event as any)?.organizerId || '-'}
                      </Text>
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
