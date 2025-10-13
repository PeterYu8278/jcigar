/**
 * 管理后台仪表板 - 重构版
 * 使用通用组件提升代码复用性
 */

import React, { useEffect, useState } from 'react'
import { Row, Col, Typography, Button, message, Spin, Table, Tag, Space, Tabs } from 'antd'
import {
  ReloadOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  DollarOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons'
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
import Card from '../../../components/common/Card'
import { formatCurrency, formatNumber } from '../../../utils/format'
import { useResponsive } from '../../../hooks/useResponsive'

const { Title } = Typography
const { TabPane } = Tabs

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isMobile } = useResponsive()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('pending')

  // 加载数据
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [usersData, ordersData, eventsData, transactionsData, cigarsData] = await Promise.all([
        getUsers(),
        getAllOrders(),
        getEvents(),
        getAllTransactions(),
        getCigars()
      ])

      setUsers(usersData)
      setOrders(ordersData)
      setEvents(eventsData)
      setTransactions(transactionsData)
      setCigars(cigarsData)
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
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM')
  
  const monthlyOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM') === currentMonth).length
  const lastMonthOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM') === lastMonth).length
  const ordersTrend = lastMonthOrders > 0 ? ((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0

  const monthlyRevenue = transactions
    .filter(t => t.amount > 0 && dayjs(t.createdAt).format('YYYY-MM') === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0)
  const lastMonthRevenue = transactions
    .filter(t => t.amount > 0 && dayjs(t.createdAt).format('YYYY-MM') === lastMonth)
    .reduce((sum, t) => sum + t.amount, 0)
  const revenueTrend = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

  // 最近订单
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(order => ({
      ...order,
      user: users.find(u => u.id === order.userId)?.displayName || t('dashboard.unknownUser')
    }))

  const completedOrders = recentOrders.filter(o => o.status === 'delivered')
  const pendingOrders = recentOrders.filter(o => o.status !== 'delivered')

  // 低库存统计
  const lowStockCount = cigars.reduce((count, c) => {
    const stock = (c as any)?.inventory?.stock ?? 0
    const min = (c as any)?.inventory?.minStock ?? 0
    return count + (stock <= min ? 1 : 0)
  }, 0)

  // 订单状态映射
  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    confirmed: 'blue',
    shipped: 'cyan',
    delivered: 'green',
    cancelled: 'red'
  }

  // 订单表格列
  const orderColumns = [
    {
      title: t('orders.orderNumber'),
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <span style={{ color: 'var(--cigar-text-primary)', fontFamily: 'monospace' }}>
          {id.slice(0, 8)}
        </span>
      )
    },
    {
      title: t('orders.customer'),
      dataIndex: 'user',
      key: 'user',
      render: (user: string) => (
        <span style={{ color: 'var(--cigar-text-primary)' }}>{user}</span>
      )
    },
    {
      title: t('orders.amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span style={{ color: 'var(--cigar-gold-primary)', fontWeight: 'bold' }}>
          {formatCurrency(amount)}
        </span>
      )
    },
    {
      title: t('orders.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>
          {t(`orders.status_${status}`)}
        </Tag>
      )
    },
    {
      title: t('common.date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: any) => (
        <span style={{ color: 'var(--cigar-text-secondary)' }}>
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
        </span>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: isMobile ? 12 : 24 }}>
      {/* 顶部标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <Title level={2} style={{ margin: 0, color: 'var(--cigar-text-primary)' }}>
          {t('navigation.dashboard')}
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadDashboardData}
          loading={loading}
        >
          {t('common.refresh')}
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable gradient onClick={() => navigate('/admin/users')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>{t('dashboard.totalUsers')}</div>
                <div style={{ color: 'var(--cigar-text-primary)', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
                  {formatNumber(totalUsers)}
                </div>
              </div>
              <UserOutlined style={{ fontSize: 40, color: 'var(--cigar-gold-primary)', opacity: 0.8 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable gradient onClick={() => navigate('/admin/orders')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>{t('dashboard.totalOrders')}</div>
                <div style={{ color: 'var(--cigar-text-primary)', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
                  {formatNumber(totalOrders)}
                </div>
                <div style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12, marginTop: 4 }}>
                  {t('dashboard.thisMonth')}: {monthlyOrders}
                </div>
                <div style={{
                  color: ordersTrend >= 0 ? '#52c41a' : '#ff4d4f',
                  fontSize: 12,
                  marginTop: 4
                }}>
                  {ordersTrend >= 0 ? '↑' : '↓'} {Math.abs(ordersTrend).toFixed(1)}%
                </div>
              </div>
              <ShoppingCartOutlined style={{ fontSize: 40, color: 'var(--cigar-gold-primary)', opacity: 0.8 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable gradient onClick={() => navigate('/admin/events')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>{t('dashboard.activeEvents')}</div>
                <div style={{ color: 'var(--cigar-text-primary)', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
                  {formatNumber(activeEvents)}
                </div>
              </div>
              <CalendarOutlined style={{ fontSize: 40, color: 'var(--cigar-gold-primary)', opacity: 0.8 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable gradient onClick={() => navigate('/admin/finance')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--cigar-text-secondary)', fontSize: 14 }}>{t('dashboard.totalRevenue')}</div>
                <div style={{ color: 'var(--cigar-text-primary)', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
                  {formatCurrency(totalRevenue)}
                </div>
                <div style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12, marginTop: 4 }}>
                  {t('dashboard.thisMonth')}: {formatCurrency(monthlyRevenue)}
                </div>
                <div style={{
                  color: revenueTrend >= 0 ? '#52c41a' : '#ff4d4f',
                  fontSize: 12,
                  marginTop: 4
                }}>
                  {revenueTrend >= 0 ? '↑' : '↓'} {Math.abs(revenueTrend).toFixed(1)}%
                </div>
              </div>
              <DollarOutlined style={{ fontSize: 40, color: 'var(--cigar-gold-primary)', opacity: 0.8 }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 警告提示 */}
      {lowStockCount > 0 && (
        <Card
          style={{
            marginBottom: 24,
            borderColor: '#faad14',
            background: 'rgba(250, 173, 20, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WarningOutlined style={{ fontSize: 24, color: '#faad14' }} />
            <div>
              <div style={{ color: 'var(--cigar-text-primary)', fontWeight: 'bold', marginBottom: 4 }}>
                {t('dashboard.lowStockAlert')}
              </div>
              <div style={{ color: 'var(--cigar-text-secondary)' }}>
                {lowStockCount} {t('dashboard.productsLowStock')}
              </div>
            </div>
            <Button
              type="primary"
              onClick={() => navigate('/admin/inventory')}
              style={{ marginLeft: 'auto' }}
            >
              {t('dashboard.viewInventory')}
            </Button>
          </div>
        </Card>
      )}

      {/* 最近订单 */}
      <Card
        title={
          <span style={{ color: 'var(--cigar-text-primary)', fontSize: 18 }}>
            {t('dashboard.recentOrders')}
          </span>
        }
        extra={
          <Button type="link" onClick={() => navigate('/admin/orders')}>
            {t('common.viewAll')}
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {isMobile ? (
          // 手机端标签页
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
            <TabPane
              tab={
                <span>
                  {t('dashboard.pendingOrders')} ({pendingOrders.length})
                </span>
              }
              key="pending"
            >
              <Table
                dataSource={pendingOrders}
                columns={orderColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            </TabPane>
            <TabPane
              tab={
                <span>
                  {t('dashboard.completedOrders')} ({completedOrders.length})
                </span>
              }
              key="completed"
            >
              <Table
                dataSource={completedOrders}
                columns={orderColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            </TabPane>
          </Tabs>
        ) : (
          // 电脑端单表格
          <Table
            dataSource={recentOrders}
            columns={orderColumns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* 快速操作 */}
      <Card
        title={
          <span style={{ color: 'var(--cigar-text-primary)', fontSize: 18 }}>
            {t('dashboard.quickActions')}
          </span>
        }
      >
        <Space size="middle" wrap>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => navigate('/admin/orders')}
          >
            {t('dashboard.manageOrders')}
          </Button>
          <Button
            icon={<UserOutlined />}
            onClick={() => navigate('/admin/users')}
          >
            {t('dashboard.manageUsers')}
          </Button>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => navigate('/admin/events')}
          >
            {t('dashboard.manageEvents')}
          </Button>
          <Button
            icon={<DollarOutlined />}
            onClick={() => navigate('/admin/finance')}
          >
            {t('dashboard.viewFinance')}
          </Button>
        </Space>
      </Card>
    </div>
  )
}

export default AdminDashboard
