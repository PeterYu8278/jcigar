// 管理后台仪表板（自定义样式版本）
import React, { useEffect, useState } from 'react'
import { Typography, Button, message, Spin } from 'antd'
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { 
  getUsers, 
  getAllOrders, 
  getEvents, 
  getAllTransactions,
  getCigars,
  getAllInventoryLogs
} from '../../../services/firebase/firestore'
import type { User, Order, Event, Transaction, Cigar } from '../../../types'
import { useTranslation } from 'react-i18next'

const { Title } = Typography

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([])

  // 加载数据
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [usersData, ordersData, eventsData, transactionsData, cigarsData, inventoryLogsData] = await Promise.all([
        getUsers(),
        getAllOrders(),
        getEvents(),
        getAllTransactions(),
        getCigars(),
        getAllInventoryLogs()
      ])
      
      setUsers(usersData)
      setOrders(ordersData)
      setEvents(eventsData)
      setTransactions(transactionsData)
      setCigars(cigarsData)
      setInventoryLogs(inventoryLogsData)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 统计数据计算
  const totalUsers = users.length
  const totalOrders = orders.length
  const activeEvents = events.filter(e => e.status === 'ongoing').length
  const totalRevenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  
  // 本月数据
  const currentMonth = dayjs().format('YYYY-MM')
  const monthlyOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM') === currentMonth).length
  const monthlyRevenue = transactions
    .filter(t => t.amount > 0 && dayjs(t.createdAt).format('YYYY-MM') === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0)
  
  // 最近订单（前5个），拆分完成/未完成
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => ({
      ...order,
      user: users.find(u => u.id === order.userId)?.displayName || t('dashboard.unknownUser')
    }))
  const completedOrders = recentOrders.filter(o => o.status === 'delivered')
  const pendingOrders = recentOrders.filter(o => o.status !== 'delivered')

  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('pending')

  // 低库存统计
  const lowStockCount = cigars.reduce((count, c) => {
    const stock = (c as any)?.inventory?.stock ?? 0
    const min = (c as any)?.inventory?.minStock ?? 0
    return count + (stock <= min ? 1 : 0)
  }, 0)


  return (
    <div style={{ minHeight: '100vh'}}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>

      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 12 }}>{t('dashboard.overview')}</h1>

      {/* 三个概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{label: t('dashboard.totalMembers'), value: totalUsers.toLocaleString()}, {label: t('dashboard.monthlyOrders'), value: monthlyOrders.toLocaleString()}, {label: t('dashboard.monthlyRevenue'), value: `RM${monthlyRevenue.toLocaleString()}`}] .map((card, idx) => (
          <div key={idx} style={{ borderRadius: 12, padding: 12, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 12, color: '#A0A0A0' }}>{card.label}</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.quickActions')}</h2>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <button onClick={() => navigate('/admin/events')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, boxShadow: '0 4px 15px rgba(244,175,37,0.35)' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"/></svg>
            <span>{t('dashboard.createEvent')}</span>
          </button>
          <button onClick={() => navigate('/admin/orders')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)', color: '#EAEAEA' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3zm12 11H5V5h10v9z" fillRule="evenodd"></path><path d="M9 7a1 1 0 100 2h2a1 1 0 100-2H9z"></path></svg>
            <span>{t('dashboard.viewOrders')}</span>
          </button>
          <button onClick={() => navigate('/admin/users')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)', color: '#EAEAEA' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd"></path></svg>
            <span>{t('dashboard.createUser')}</span>
          </button>
          <button onClick={() => navigate('/admin/inventory')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)', color: '#EAEAEA' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"></path><path clipRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 2v10h10V5H5z" fillRule="evenodd"></path></svg>
            <span>{t('dashboard.inventoryManagement')}</span>
          </button>
            </div>
            </div>

      {/* 订单标签页 */}
      <div style={{ marginBottom: 16, paddingInline: 8 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(244,175,37,0.2)' }}>
          {(['pending','completed'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: '2px solid transparent',
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
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
              >
                {tabKey === 'completed' ? t('dashboard.completedOrders') : t('dashboard.pendingOrders')}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    borderRadius: '1px'
                  }} />
                )}
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          {(activeTab === 'completed' ? completedOrders : pendingOrders).map((order) => (
            <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 9999, background: 'rgba(45,39,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img alt="avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqh6yOfMjU5qQSoCZPZvRqAiz-okAgrdu0FpYXfw5uHOQsuU4n9sXB0tgWxKp0S0CeRoIfGobj8db5AYyR99MzIRYRhGQ6FTM8hDdbqiekQypZbWKI-hdGzfS2pxYZNJ6bYvPj6CXp9XlDHxFyPDtN3i6CETf5OL_Cwg7QBM79IF0fAn-CPEBxheKV9HTDuDr0eao0xcYzNAf_ho8FNb9cgnap5ZOygDZktOCV_aV3y2MBiYrxtLFdefqLos7npLS50yvMaM7cH9MK" style={{ width: 48, height: 48, borderRadius: 9999 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#EAEAEA' }}>{order.user}</div>
                <div style={{ fontSize: 12, color: '#A0A0A0' }}>{t('dashboard.orderNumber')} #{String(order.id).slice(0, 8)}</div>
                </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#FDE08D' }}>RM{order.total.toFixed(2)}</div>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: order.status === 'delivered' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: order.status === 'delivered' ? '#22c55e' : '#ef4444' }}>
                  {order.status === 'delivered' ? t('dashboard.completed') : t('dashboard.pending')}
                </span>
              </div>
            </div>
          ))}
          {(activeTab === 'completed' ? completedOrders : pendingOrders).length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>{t('dashboard.noCompletedOrders')}</div>
          )}
        </div>
      </div>

      {/* 最近活动 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.recentActivities')}</h2>
        <div style={{ marginTop: 8, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
          ) : events.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <img alt="event" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqZ66H4cXQr5mFjjZyArt6LdIb2BIhk4GF2JHKx2UCbrmxHNifoFkgto2LG8dL9qzuUPUV1f-BSFt8puUWcvCTY9TDHmgNLRVDHbY5AQDcoEfpA2UCkA7yw2LW8wyULzH1uKlNeWPJWxeQz9OJLA1t1bX9m6isA9rQp2vMKu50gx-ykzHIEFQYiHCFdw6JtNhTVBYbcmO0OXa-tiLBaQCRrKo2931k70O13w9CwSQqcROyUsbO70ENYAHrnobDtbOq44lMixgFghpH" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#EAEAEA' }}>{events[0].title}</div>
                <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>
                  {(() => {
                    const startDate = (events[0].schedule.startDate as any)?.toDate ? (events[0].schedule.startDate as any).toDate() : events[0].schedule.startDate
                    return startDate ? dayjs(startDate).format('YYYY-MM-DD') : t('dashboard.noTimeSet')
                  })()}
                </div>
                <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>
                  {t('dashboard.registeredCount', { 
                    registered: ((events[0] as any).participants?.registered || []).length,
                    max: (events[0] as any).participants?.maxParticipants || 0
                  })}
                </div>
              </div>
                          </div>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>{t('dashboard.noEventData')}</div>
          )}
              </div>
              </div>

      {/* 库存状态 */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.stockStatus')}</h2>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 9999, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>!</div>
                        <div>
              <div style={{ fontWeight: 700, color: '#EAEAEA' }}>{t('dashboard.lowStockWarning')}</div>
              <div style={{ fontSize: 12, color: '#A0A0A0' }}>{t('dashboard.lowStockCount', { count: lowStockCount })}</div>
                          </div>
                        </div>
          <div style={{ color: '#A0A0A0' }}>&gt;</div>
                      </div>
                    </div>
    </div>
  )
}

export default AdminDashboard
