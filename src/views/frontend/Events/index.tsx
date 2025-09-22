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
    <div style={{ padding: '24px' }}>
      <Title level={2}>聚会活动</Title>
      <Paragraph type="secondary">
        参与我们的雪茄聚会活动，与同好分享品鉴心得
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
                    
                    {/* 可选：结束时间展示 */}
                    
                    <Space>
                      <EnvironmentOutlined />
                      <Text>{(event as any)?.location?.name || '-'}</Text>
                    </Space>
                    
                    <Space>
                      <DollarOutlined />
                      <Text strong>¥{(event as any)?.participants?.fee ?? 0}</Text>
                    </Space>
                    
                    <Space>
                      <TeamOutlined />
                      <Text>
                        {(() => {
                          const reg = (event as any)?.participants?.registered || []
                          const max = (event as any)?.participants?.maxParticipants || 0
                          return `${reg.length}/${max} 人`
                        })()}
                      </Text>
                    </Space>
                    
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                      <Avatar size="small" style={{ marginRight: 8 }}>
                        {String((event as any)?.organizerId || '主').slice(0,1)}
                      </Avatar>
                      <Text type="secondary">主办：{(event as any)?.organizerId || '-'}</Text>
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
