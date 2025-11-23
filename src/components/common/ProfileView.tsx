// 通用用户档案视图组件
import React, { useMemo, useState, useEffect } from 'react'
import { Row, Col, Card, Typography, Tag, Button, Space, Spin, message } from 'antd'
import { 
  CalendarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  UserOutlined
} from '@ant-design/icons'

const { Text } = Typography

import { getEventsByUser, getUsers, getOrdersByUser, getCigars, getDocument } from '../../services/firebase/firestore'
import { getUserPointsRecords } from '../../services/firebase/pointsRecords'
import type { User, Event, Order, Cigar, PointsRecord } from '../../types'
import { useTranslation } from 'react-i18next'
import { MemberProfileCard } from './MemberProfileCard'

interface ProfileViewProps {
  user?: User | null          // 直接传入用户对象
  userId?: string              // 或传入用户ID（组件内部加载）
  readOnly?: boolean           // 是否只读模式
  showEditButton?: boolean     // 是否显示编辑按钮
  onEdit?: (user: User) => void // 编辑回调
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user: propUser,
  userId: propUserId,
  readOnly = false,
  showEditButton = false,
  onEdit
}) => {
  const { t } = useTranslation()
  const [user, setUser] = useState<User | null>(propUser || null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [showMemberCard, setShowMemberCard] = useState(false)
  const [activeTab, setActiveTab] = useState<'cigar' | 'points' | 'activity' | 'referral'>('cigar')
  const [userEvents, setUserEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [referredUsers, setReferredUsers] = useState<User[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([])
  const [loadingPointsRecords, setLoadingPointsRecords] = useState(false)

  // 如果传入userId，加载用户数据
  useEffect(() => {
    if (propUserId && !propUser) {
      const loadUser = async () => {
        setLoadingUser(true)
        try {
          const userData = await getDocument('users', propUserId) as User
          if (userData) {
            setUser({ ...userData, id: propUserId })
          }
        } catch (error) {
          console.error('Error loading user:', error)
        } finally {
          setLoadingUser(false)
        }
      }
      loadUser()
    }
  }, [propUserId, propUser])

  // 当propUser变化时更新user
  useEffect(() => {
    if (propUser) {
      setUser(propUser)
    }
  }, [propUser])

  // 加载用户参与的活动
  useEffect(() => {
    const loadUserEvents = async () => {
      if (!user?.id) return
      setLoadingEvents(true)
      try {
        const events = await getEventsByUser(user.id)
        setUserEvents(events)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setLoadingEvents(false)
      }
    }
    loadUserEvents()
  }, [user?.id])

  // 加载用户订单并填充雪茄名称
  useEffect(() => {
    const loadUserOrders = async () => {
      if (!user?.id) return
      setLoadingOrders(true)
      try {
        const [orders, cigars] = await Promise.all([
          getOrdersByUser(user.id),
          getCigars()
        ])
        
        // 创建雪茄ID到名称的映射
        const cigarMap = new Map(cigars.map(c => [c.id, c.name]))
        
        // 为每个订单项填充雪茄名称
        const ordersWithNames = orders.map(order => ({
          ...order,
          items: order.items.map(item => ({
            ...item,
            name: item.name || cigarMap.get(item.cigarId) || item.cigarId
          }))
        }))
        
        setUserOrders(ordersWithNames)
      } catch (error) {
        console.error('Error loading orders:', error)
      } finally {
        setLoadingOrders(false)
      }
    }
    loadUserOrders()
  }, [user?.id])

  // 加载引荐的用户
  useEffect(() => {
    const loadReferredUsers = async () => {
      if (!user?.referral?.referrals || user.referral.referrals.length === 0) {
        setReferredUsers([])
        return
      }
      
      setLoadingReferrals(true)
      try {
        const allUsers = await getUsers()
        // 筛选出引荐的用户（兼容新旧格式：string[] 或对象数组）
        const referralUserIds = user.referral.referrals.map((r: any) => 
          typeof r === 'string' ? r : r.userId
        );
        const referred = allUsers.filter(u => referralUserIds.includes(u.id))
        // 按注册日期降序排序
        referred.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
        setReferredUsers(referred)
      } catch (error) {
        console.error('Error loading referrals:', error)
      } finally {
        setLoadingReferrals(false)
      }
    }
    loadReferredUsers()
  }, [user?.referral?.referrals])

  // 加载积分记录
  useEffect(() => {
    const loadPointsRecords = async () => {
      if (!user?.id) {
        setPointsRecords([])
        return
      }
      
      setLoadingPointsRecords(true)
      try {
        console.log('[ProfileView] 加载积分记录，用户ID:', user.id)
        const records = await getUserPointsRecords(user.id, 50)
        console.log('[ProfileView] 积分记录加载结果:', records.length, '条记录')
        setPointsRecords(records)
      } catch (error) {
        console.error('[ProfileView] 加载积分记录失败:', error)
        message.error(t('pointsConfig.loadRecordsFailed'))
        setPointsRecords([])
      } finally {
        setLoadingPointsRecords(false)
      }
    }
    loadPointsRecords()
  }, [user?.id, t])

  // 计算雪茄购买总数量
  const totalCigarsPurchased = useMemo(() => {
    return userOrders.reduce((total, order) => {
      const orderTotal = order.items.reduce((sum, item) => sum + item.quantity, 0)
      return total + orderTotal
    }, 0)
  }, [userOrders])

  // 用户统计数据
  const userStats = [
    { title: t('profile.eventsJoined'), value: userEvents.length, icon: <CalendarOutlined /> },
    { title: t('profile.cigarsPurchased'), value: totalCigarsPurchased, icon: <ShoppingOutlined /> },
    { title: t('profile.communityPoints'), value: (user?.membership as any)?.points || 0, icon: <TrophyOutlined /> },
  ]

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'bronze': return 'default'
      case 'silver': return 'default'
      case 'gold': return '#faad14'
      case 'platinum': return '#722ed1'
      default: return 'default'
    }
  }

  const getMembershipText = (level: string) => {
    switch (level) {
      case 'bronze': return t('profile.bronzeMember')
      case 'silver': return t('profile.silverMember')
      case 'gold': return t('profile.goldMember')
      case 'platinum': return t('profile.platinumMember')
      default: return t('profile.regularMember')
    }
  }

  if (loadingUser) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
        <p>{t('usersAdmin.userNotFound')}</p>
      </div>
    )
  }

  return (
    <div style={{ color: '#FFFFFF' }}>
      {/* User Profile Section */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        {/* Avatar/Member Card */}
        <MemberProfileCard
          user={user}
          showMemberCard={showMemberCard}
          onToggleMemberCard={setShowMemberCard}
          getMembershipText={getMembershipText}
          enableQrModal={true}
        />

        {/* User Info */}
        <div style={{ marginTop: '16px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: '0 0 8px 0'
          }}>
            {user.displayName || t('profile.noNameSet')}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '8px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <span>{getMembershipText(user.membership?.level || 'bronze')}</span>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
            <span>{t('usersAdmin.points')}: {(user.membership as any)?.points || 0}</span>
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
            <p style={{ margin: '4px 0' }}>{t('auth.email')}: {user.email || '-'}</p>
            <p style={{ margin: '4px 0' }}>{t('auth.phone')}: {(user as any)?.profile?.phone || '-'}</p>
          </div>
        </div>

        {/* Edit Button */}
        {showEditButton && onEdit && (
          <div style={{ width: '100%', maxWidth: '640px', margin: '16px auto 0 auto' }}>
            <Button
              type="primary"
              onClick={() => onEdit(user)}
              style={{
                width: '100%',
                height: '48px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                border: 'none',
                borderRadius: '8px',
                color: '#111',
              }}
            >
              {t('usersAdmin.editProfile')}
            </Button>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '10px', 
        marginBottom: '24px',
        maxWidth: '640px',
        margin: '0 auto 24px auto'
      }}>
        {userStats.map((stat, index) => (
          <div key={index} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(244, 175, 37, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              {stat.title}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Section */}
      <div>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(244,175,37,0.2)',
          marginBottom: '24px'
        }}>
          {(['cigar', 'points', 'activity', 'referral'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: isActive ? '2px solid transparent' : '2px solid transparent',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              position: 'relative' as const,
            }
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
            }
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            }
            
            const getTabLabel = (key: string) => {
              switch (key) {
                case 'cigar': return t('usersAdmin.cigarRecords')
                case 'points': return t('usersAdmin.pointsRecords')
                case 'activity': return t('usersAdmin.activityRecords')
                case 'referral': return t('usersAdmin.referralRecords')
                default: return ''
              }
            }

            return (
              <button
                key={tabKey}
                style={{
                  ...baseStyle,
                  ...(isActive ? activeStyle : inactiveStyle),
                }}
                onClick={() => setActiveTab(tabKey)}
              >
                {getTabLabel(tabKey)}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Records List */}
        <div style={{ paddingBottom: '24px' }}>
          {activeTab === 'cigar' && (
            loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Space direction="vertical" size="middle">
                  <div style={{ fontSize: '24px', color: '#ffd700' }}>
                    <ShoppingOutlined spin />
                  </div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {t('common.loading')}
                  </Text>
                </Space>
              </div>
            ) : userOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {t('usersAdmin.noCigarRecords')}
                </p>
              </div>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {userOrders.map((order) => {
                  const orderDate = order.createdAt instanceof Date 
                    ? order.createdAt 
                    : (order.createdAt as any)?.toDate 
                      ? (order.createdAt as any).toDate() 
                      : new Date(order.createdAt)
                  
                  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
                  
                  return (
                    <Card
                      key={order.id}
                      size="small"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <Text strong style={{ color: '#ffd700', fontSize: '14px' }}>
                            {t('ordersAdmin.order')} #{order.id.slice(-6).toUpperCase()}
                          </Text>
                          <div style={{ marginTop: '4px' }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                              {orderDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </Text>
                          </div>
                        </div>
                        <Tag color={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'default'}>
                          {order.status === 'completed' ? t('ordersAdmin.status.completed') : 
                           order.status === 'pending' ? t('ordersAdmin.status.pending') : 
                           order.status === 'cancelled' ? t('ordersAdmin.status.cancelled') : order.status}
                        </Tag>
                      </div>
                      
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {order.items.map((item, index) => {
                          const displayName = item.cigarId.startsWith('FEE:') 
                            ? t('eventsAdmin.eventFee')
                            : (item.name || item.cigarId)
                          
                          return (
                            <div key={index} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '8px 0',
                              borderTop: index > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                            }}>
                              <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                                {displayName}
                              </Text>
                              <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                × {item.quantity}
                              </Text>
                            </div>
                          )
                        })}
                      </Space>
                      
                      <div style={{ 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                          {t('ordersAdmin.totalQuantity')}: {totalQuantity}
                        </Text>
                        <Text strong style={{ color: '#ffd700', fontSize: '16px' }}>
                          RM {order.total.toFixed(2)}
                        </Text>
                      </div>
                    </Card>
                  )
                })}
              </Space>
            )
          )}

          {activeTab === 'points' && (
            loadingPointsRecords ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Space direction="vertical" size="middle">
                  <div style={{ fontSize: '24px', color: '#ffd700' }}>
                    <TrophyOutlined spin />
                  </div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {t('common.loading')}
                  </Text>
                </Space>
              </div>
            ) : pointsRecords.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {t('usersAdmin.noPointsRecords')}
              </p>
            </div>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {pointsRecords.map((record) => {
                  const recordDate = record.createdAt instanceof Date 
                    ? record.createdAt 
                    : (record.createdAt as any)?.toDate 
                      ? (record.createdAt as any).toDate() 
                      : new Date(record.createdAt)
                  
                  const getSourceText = (source: string) => {
                    const sourceMap: Record<string, string> = {
                      registration: t('pointsConfig.records.sources.registration'),
                      referral: t('pointsConfig.records.sources.referral'),
                      purchase: t('pointsConfig.records.sources.purchase'),
                      event: t('pointsConfig.records.sources.event'),
                      profile: t('pointsConfig.records.sources.profile'),
                      checkin: t('pointsConfig.records.sources.checkin'),
                      visit: '驻店时长费用',
                      membership_fee: '年费',
                      reload: '充值',
                      admin: t('pointsConfig.records.sources.admin'),
                      other: t('pointsConfig.records.sources.other')
                    }
                    return sourceMap[source] || source
                  }
                  
                  return (
                    <Card
                      key={record.id}
                      size="small"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                              {recordDate.toLocaleString('zh-CN', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                              {getSourceText(record.source)}
                            </Text>
                          </div>
                          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px', display: 'block' }}>
                            {record.description}
                          </Text>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <Text 
                            strong 
                            style={{ 
                              color: record.type === 'earn' ? '#52c41a' : '#ff4d4f', 
                              fontSize: '18px',
                              display: 'block'
                            }}
                          >
                            {record.type === 'earn' ? '+' : '-'}{record.amount}
                          </Text>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </Space>
            )
          )}

          {activeTab === 'activity' && (
            loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Space direction="vertical" size="middle">
                  <div style={{ fontSize: '24px', color: '#ffd700' }}>
                    <CalendarOutlined spin />
                  </div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {t('common.loading')}
                  </Text>
                </Space>
              </div>
            ) : userEvents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {t('usersAdmin.noActivityRecords')}
                </p>
              </div>
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {userEvents.map((event) => {
                  const startDate = event.schedule.startDate instanceof Date 
                    ? event.schedule.startDate 
                    : (event.schedule.startDate as any)?.toDate 
                      ? (event.schedule.startDate as any).toDate() 
                      : new Date(event.schedule.startDate);
                  
                  const isRegistered = event.participants?.registered?.includes(user?.id || '');
                  const isCheckedIn = event.participants?.checkedIn?.includes(user?.id || '');
                  
                  return (
                    <div
                      key={event.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(244, 175, 37, 0.2)',
                        display: 'flex',
                        gap: '12px'
                      }}
                    >
                      {/* 活动封面 */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        {event.coverImage ? (
                          <img 
                            src={event.coverImage} 
                            alt={event.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.3)'
                          }}>
                            <CalendarOutlined style={{ fontSize: '32px' }} />
                          </div>
                        )}
                      </div>
                      
                      {/* 活动信息 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {event.title}
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '8px'
                        }}>
                          {startDate.toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* 状态标签 */}
                          <Tag 
                            color={
                              event.status === 'upcoming' ? 'blue' :
                              event.status === 'ongoing' ? 'green' :
                              event.status === 'completed' ? 'default' :
                              'red'
                            }
                            style={{ margin: 0, fontSize: '11px' }}
                          >
                            {
                              event.status === 'upcoming' ? t('profile.eventStatus.upcoming') :
                              event.status === 'ongoing' ? t('profile.eventStatus.ongoing') :
                              event.status === 'completed' ? t('profile.eventStatus.completed') :
                              t('profile.eventStatus.cancelled')
                            }
                          </Tag>
                          
                          {/* 参与状态标签 */}
                          {isCheckedIn && (
                            <Tag color="success" style={{ margin: 0, fontSize: '11px' }}>
                              {t('profile.participationStatus.checkedIn')}
                            </Tag>
                          )}
                          {isRegistered && !isCheckedIn && (
                            <Tag color="warning" style={{ margin: 0, fontSize: '11px' }}>
                              {t('profile.participationStatus.registered')}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Space>
            )
          )}

          {activeTab === 'referral' && (
            <>
              {/* 引荐统计 */}
              <Row gutter={12} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(244, 175, 37, 0.2)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                      {user?.referral?.referrals?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      {t('profile.totalReferred')}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(244, 175, 37, 0.2)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                      {user?.membership?.referralPoints || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      {t('profile.referralPoints')}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* 引荐记录列表 */}
              {loadingReferrals ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Spin />
                </div>
              ) : referredUsers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    {t('usersAdmin.noReferralRecords')}
                  </p>
                </div>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {referredUsers.map((referred) => {
                    const joinDate = referred.createdAt instanceof Date 
                      ? referred.createdAt 
                      : (referred.createdAt as any)?.toDate 
                        ? (referred.createdAt as any).toDate() 
                        : new Date(referred.createdAt);
                    
                    return (
                      <div key={referred.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(244, 175, 37, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        {/* 用户头像 */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(244, 175, 37, 0.3), rgba(244, 175, 37, 0.1))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#ffd700',
                          border: '2px solid rgba(244, 175, 37, 0.3)'
                        }}>
                          {referred.displayName?.charAt(0) || '?'}
                        </div>
                        
                        {/* 用户信息 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                            {referred.displayName || t('profile.unknownUser')}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                            {joinDate.toLocaleDateString('zh-CN')} {t('profile.joined')}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            {t('profile.memberNumber')}: {referred.memberId || '-'}
                          </div>
                        </div>
                        
                        {/* 会员等级标签 */}
                        <Tag color={getMembershipColor(referred.membership?.level || 'bronze')}>
                          {getMembershipText(referred.membership?.level || 'bronze')}
                        </Tag>
                      </div>
                    );
                  })}
                </Space>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

