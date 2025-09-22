// 管理后台仪表板
import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Statistic, Progress, Table, Tag, Space, Button, List, Avatar, message, Spin } from 'antd'
import { 
  UserOutlined, 
  ShoppingOutlined, 
  CalendarOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  PlusOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  ReloadOutlined
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

const { Title } = Typography

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
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
      message.error('加载数据失败')
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
  
  // 最近订单（取前5个）
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => ({
      ...order,
      user: users.find(u => u.id === order.userId)?.displayName || '未知用户'
    }))


  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>仪表板</Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadDashboardData}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月订单"
              value={monthlyOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中活动"
              value={activeEvents}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={monthlyRevenue}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#f5222d' }}
              suffix="CNY"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 快速操作 */}
        <Col span={12}>
          <Card title="快速操作" extra={<PlusOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                block 
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/events')}
              >
                创建活动
              </Button>
              <Button 
                block 
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/admin/orders')}
              >
                查看订单
              </Button>
              <Button 
                block 
                icon={<UserOutlined />}
                onClick={() => navigate('/admin/users')}
              >
                用户管理
              </Button>
              <Button 
                block 
                icon={<DatabaseOutlined />}
                onClick={() => navigate('/admin/inventory')}
              >
                库存管理
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 系统状态 */}
        <Col span={12}>
          <Card title="系统状态" extra={<BarChartOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>总订单数</span>
                <span style={{ fontWeight: 'bold' }}>{totalOrders}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>总收入</span>
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>¥{totalRevenue.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>雪茄品种</span>
                <span style={{ fontWeight: 'bold' }}>{cigars.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>活跃活动</span>
                <span style={{ fontWeight: 'bold' }}>{activeEvents}</span>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 库存状态 */}
        <Col span={12}>
          <Card 
            title="库存状态" 
            extra={
              <Button type="link" onClick={() => navigate('/admin/inventory')}>
                查看详情
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {cigars.slice(0, 5).map(cigar => {
                const stockPercentage = (cigar.inventory.stock / (cigar.inventory.stock + cigar.inventory.reserved)) * 100
                const isLowStock = stockPercentage < 30
                return (
                  <div key={cigar.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>{cigar.name}</span>
                      <span>{cigar.inventory.stock}支</span>
                    </div>
                    <Progress 
                      percent={Math.round(stockPercentage)} 
                      status={isLowStock ? 'exception' : 'active'}
                      showInfo={false}
                    />
                  </div>
                )
              })}
              {cigars.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                  暂无雪茄库存数据
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 最近订单 */}
        <Col span={12}>
          <Card 
            title="最近订单" 
            extra={
              <Button type="link" onClick={() => navigate('/admin/orders')}>
                查看全部
              </Button>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
              </div>
            ) : recentOrders.length > 0 ? (
              <List
                dataSource={recentOrders}
                renderItem={(order) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => navigate('/admin/orders')}
                      >
                        查看
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {order.id.substring(0, 8)}...
                        </span>
                      }
                      description={
                        <div>
                          <div>{order.user}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {dayjs(order.createdAt).format('MM-DD HH:mm')}
                          </div>
                        </div>
                      }
                    />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#52c41a' }}>
                        ¥{order.total.toFixed(2)}
                      </div>
                      <Tag color={
                        order.status === 'delivered' ? 'green' :
                        order.status === 'pending' ? 'orange' :
                        order.status === 'shipped' ? 'blue' :
                        order.status === 'confirmed' ? 'cyan' : 'default'
                      }>
                        {order.status === 'delivered' ? '已送达' :
                         order.status === 'pending' ? '待确认' :
                         order.status === 'shipped' ? '已发货' :
                         order.status === 'confirmed' ? '已确认' : order.status}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                暂无订单数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 最近活动 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card 
            title="最近活动" 
            extra={
              <Button type="link" onClick={() => navigate('/admin/events')}>
                查看全部
              </Button>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
              </div>
            ) : events.length > 0 ? (
              <List
                dataSource={events.slice(0, 5)}
                renderItem={(event) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => navigate('/admin/events')}
                      >
                        查看
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={event.title}
                      description={
                        <div>
                          <div>{(event as any).description || '暂无描述'}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            {(() => {
                              const startDate = (event.schedule.startDate as any)?.toDate ? 
                                (event.schedule.startDate as any).toDate() : 
                                event.schedule.startDate
                              return startDate ? dayjs(startDate).format('YYYY-MM-DD') : '未设置时间'
                            })()}
                          </div>
                        </div>
                      }
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Tag color={
                        event.status === 'published' ? 'blue' :
                        event.status === 'ongoing' ? 'green' :
                        event.status === 'completed' ? 'default' :
                        event.status === 'cancelled' ? 'red' : 'default'
                      }>
                        {event.status === 'published' ? '已发布' :
                         event.status === 'ongoing' ? '进行中' :
                         event.status === 'completed' ? '已结束' :
                         event.status === 'cancelled' ? '已取消' :
                         event.status === 'draft' ? '草稿' : event.status}
                      </Tag>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                        {((event as any).participants?.registered || []).length}/{(event as any).participants?.maxParticipants || 0} 人
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                暂无活动数据
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminDashboard
